from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from pymongo import MongoClient
from pymongo.errors import ConfigurationError
import os
from bson.objectid import ObjectId
import pandas as pd
import scipy.sparse as sps 
import datetime

from .llm_utils import build_explain_prompt, call_gemini

from .cb_model import CBModel
from .cf_model import CFModel
from .features import load_and_transform_data, build_id_maps, build_item_user_matrix, get_user_purchased_categories
from .hybrid import HybridRecommender

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://rahulgupta:231fa04862@cluster16.f4qysbe.mongodb.net/Qwipo?retryWrites=true&w=majority&appName=Cluster16")

try:
 client = MongoClient(MONGO_URI)
 client.admin.command('ping')
 db = client["Qwipo"]
 print("Successfully connected to MongoDB Atlas.")
except ConfigurationError as e:
 print(f"FATAL ERROR: MongoDB connection failed. Details: {e}")
 client = None
 db = None

app = FastAPI(title="Qwipo Hybrid Recommender")

cf_model = CFModel(n_factors=20)
cb_model = CBModel()
hybrid_recommender = None
orders_df = None
products_df = None
u2idx, i2idx = {}, {}
item_user_matrix = None
all_retailers = []
all_products = []
trending_product_ids = []

def initialize_models():
 global hybrid_recommender, orders_df, products_df, u2idx, i2idx, all_retailers, all_products, item_user_matrix, trending_product_ids

 if db is None:
  print("Database connection failed during startup. Skipping model initialization.")
  return

 orders_cursor = db.orders.find({})
 products_cursor = db.products.find({})

 orders_df_raw, products_df_raw = load_and_transform_data(orders_cursor, products_cursor)
 products_df = products_df_raw

 trending_product_ids = products_df.sort_values(by='stock', ascending=False)['product_id'].tolist()[:20]

 if orders_df_raw.empty or products_df.empty:
  print("No sufficient data found. Initializing Hybrid Recommender for basic lookup.")
  if not products_df.empty:
   all_retailers = []
   all_products = products_df['product_id'].tolist()
   u2idx = {}
   i2idx = {p: i for i, p in enumerate(all_products)}
   item_user_matrix = sps.csc_matrix((len(all_products), 0))
   cb_model.build_embeddings(products_df)
   cf_model.model = None
   hybrid_recommender = HybridRecommender(
    cf_model, cb_model, products_df, u2idx, i2idx, all_products, item_user_matrix, []
   )
  return

 orders_df = orders_df_raw[orders_df_raw['product_id'].isin(products_df['product_id'])]

 if orders_df.empty:
  print("All products in historical orders are now deleted. Cannot train CF.")
  return

 u2idx, i2idx, all_retailers_list, all_product_ids_list = build_id_maps(orders_df)
 item_user_matrix = build_item_user_matrix(orders_df, u2idx, i2idx)

 all_retailers = all_retailers_list
 all_products = all_product_ids_list

 cf_model.fit(item_user_matrix)
 cb_model.build_embeddings(products_df)

 hybrid_recommender = HybridRecommender(
  cf_model, cb_model, products_df, u2idx, i2idx, all_product_ids_list, item_user_matrix, []
 )
 print("Hybrid recommendation models initialized and fitted successfully.")

@app.on_event("startup")
async def startup_event():
 initialize_models()

app.add_middleware(
 CORSMiddleware,
 allow_origins=["*"],
 allow_credentials=True,
 allow_methods=["*"],
 allow_headers=["*"],
)

class ProductOut(BaseModel):
 product_id: str
 title: str
 score: float

class ExplanationItem(BaseModel):
 product_id: str
 title: str
 text: str

class ExplanationOut(BaseModel):
 items: List[ExplanationItem]
 tip: Optional[str]

class RecommendResponse(BaseModel):
 retailer_id: str
 recommendations: List[ProductOut]
 explanation: ExplanationOut

class BehaviorInput(BaseModel):
 recent_behavior_ids: List[str]

def get_seasonal_guess(category):
 month = datetime.datetime.now().month
 if category.lower() in ['sweets', 'dry fruits', 'ghee'] and month in [9, 10, 11]:
  return "Festive Season"
 if category.lower() in ['cold drinks', 'ice cream', 'beverages'] and month in [3, 4, 5, 6]:
  return "Summer Demand"
 if category.lower() in ['tea', 'coffee', 'soup'] and month in [12, 1, 2]:
  return "Winter Comfort"
 return None

@app.post("/recommendations/{retailer_id}", response_model=RecommendResponse)
def recommend(retailer_id: str, input_data: BehaviorInput, top_k: int = 10):
 global hybrid_recommender, db, orders_df, products_df, trending_product_ids

 if hybrid_recommender is None:
  raise HTTPException(status_code=503, detail="Recommendation models are not ready. Check server logs for DB or data issues.")
 
 user_categories = []
 if orders_df is not None and products_df is not None and not orders_df.empty:
  user_categories = get_user_purchased_categories(retailer_id, orders_df, products_df)
 
 recent_behavior_ids = input_data.recent_behavior_ids
 hybrid_recommender.user_purchased_categories = user_categories

 recs = hybrid_recommender.recommend(
  user_id=retailer_id,
  top_k=top_k,
  recent_behavior_ids=recent_behavior_ids
 )

 final_recs = []
 is_fallback = False

 if not recs:
  print(f"No personalized recommendations for user {retailer_id}. Falling back to trending.")
  is_fallback = True
  for prod_id in trending_product_ids[:top_k]:
   product_info = products_df[products_df['product_id'] == prod_id]
   if not product_info.empty:
    final_recs.append({
     'product_id': prod_id,
     'title': product_info.iloc[0].get('name', 'Unknown'),
     'score': 1.0,
    })
 else:
  final_recs = recs

 recommendations_for_gemini = []
 max_score = max(r.get('score', 0) for r in final_recs) if final_recs else 0.0

 for r in final_recs:
  product_id = r['product_id']
  product_info_row = products_df[products_df['product_id'] == product_id]
  if not product_info_row.empty:
   info = product_info_row.iloc[0]
   is_trending = is_fallback or (r['score'] == max_score and product_id in trending_product_ids)
   is_frequent = r.get('score', 0) > 0.8 and not is_fallback
   seasonal_guess = get_seasonal_guess(info.get('category', ''))
   recommendations_for_gemini.append({
    **r,
    'category': info.get('category', 'General'),
    'is_frequent': is_frequent,
    'is_trending': is_trending,
    'seasonal_guess': seasonal_guess,
   })

 prompt = build_explain_prompt(retailer_id, recommendations_for_gemini)
 gemini_output = call_gemini(prompt)

 explanation_items = [
  ExplanationItem(
   product_id=r['product_id'],
   title=r['title'],
   text=next((item['text'] for item in gemini_output.get("items", []) if item['title'] == r['title']),
    "AI rationale pending or unavailable.")
  ) for r in recommendations_for_gemini
 ]

 explanation = ExplanationOut(
  items=explanation_items,
  tip=gemini_output.get("tip", "Look for new items in your preferred categories to diversify stock.")
 )

 pydantic_recs = [
  ProductOut(
   product_id=r['product_id'],
   title=r['title'],
   score=r['score']
  ) for r in final_recs if r['product_id'] in [p['product_id'] for p in recommendations_for_gemini]
 ]

 return {
  "retailer_id": retailer_id,
  "recommendations": pydantic_recs,
  "explanation": explanation
 }
