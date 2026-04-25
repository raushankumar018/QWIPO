from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class CBModel:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)
        self.embeddings = None
        self.product_index = None
        self.product_map = {}

    def build_embeddings(self, products_df):
        # Combine relevant text features for the model
        products_df['combined_text'] = products_df['name'].fillna('') + ' ' + \
                                      products_df['description'].fillna('') + ' ' + \
                                      products_df['category'].fillna('') + ' ' + \
                                      products_df['tags'].apply(lambda x: ' '.join(x) if isinstance(x, list) else '')
        
        texts = products_df['combined_text'].tolist()
        emb = self.model.encode(texts, show_progress_bar=True)
        self.embeddings = np.array(emb)
        self.product_index = products_df['product_id'].tolist()
        self.product_map = {prod_id: i for i, prod_id in enumerate(self.product_index)}
        return self.embeddings

    def recommend_similar(self, product_ids, top_k=20):
        if self.embeddings is None or not self.product_index:
            return []
        
        indices = [self.product_map[pid] for pid in product_ids if pid in self.product_map]
        if not indices:
            return []
            
        vec = self.embeddings[indices].mean(axis=0)
        sims = cosine_similarity([vec], self.embeddings)[0]
        
        # Exclude the original products from the recommendation list
        sims[indices] = -1
        
        topk_indices = sims.argsort()[-top_k:][::-1]
        
        return list(zip(topk_indices, sims[topk_indices]))