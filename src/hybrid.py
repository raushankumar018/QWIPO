import numpy as np
import scipy.sparse as sps

# We assume normalize_scores is imported from utils.py which you provided:
def normalize_scores(arr):
    arr = np.array(arr, dtype=float)
    # Check if all values are identical (to prevent division by zero)
    if arr.max() - arr.min() < 1e-9:
        return np.zeros_like(arr)
    # This normalization scales all values to the range [0, 1]
    return (arr - arr.min()) / (arr.max() - arr.min())


class HybridRecommender:
    def __init__(self, cf_model, cb_model, all_products, u2idx, i2idx, all_product_ids, item_user_matrix, user_purchased_categories):
        self.cf = cf_model
        self.cb = cb_model
        self.all_products = all_products
        self.u2idx = u2idx
        self.i2idx = i2idx
        self.all_product_ids = all_product_ids
        self.idx2i = {v: k for k, v in i2idx.items()}
        self.item_user_matrix = item_user_matrix
        self.user_purchased_categories = user_purchased_categories # Used by Category Boosting

    def recommend(self, user_id, top_k=10, recent_behavior_ids=[], alpha=0.7):
        user_index = self.u2idx.get(user_id)
        
        # --- 1. Handle New/Unknown Users ---
        if user_index is None:
            # Returning an empty list triggers the 'trending products' fallback in api.py
            print(f"User {user_id} not found in CF model data. Reverting to Trending Fallback.")
            return []
        
        purchased_indices = self.item_user_matrix[:, user_index].indices
        if len(purchased_indices) == 0:
            # User is known but has no orders. Reverting to 'trending' list.
            print(f"User {user_id} has no purchase history. Reverting to Trending Fallback.")
            return []


        # 2. Collaborative Filtering Score (Based on Purchases)
        cf_recs = self.cf.recommend_for_user(user_index, N=500)
        cf_raw_scores = np.zeros(len(self.all_product_ids))
        for idx, score in cf_recs:
            if idx < len(cf_raw_scores):
                cf_raw_scores[idx] = score
        cf_norm = normalize_scores(cf_raw_scores)
            
        # 3. Content-Based Filtering scores (Based on Similarity to Purchased Items)
        cb_raw_scores = np.zeros(len(self.all_product_ids))
        if self.cb.embeddings is not None:
            purchased_item_ids = [self.idx2i[idx] for idx in purchased_indices]
            cb_recs = self.cb.recommend_similar(purchased_item_ids, top_k=200)
            for idx, score in cb_recs:
                if idx < len(cb_raw_scores):
                    cb_raw_scores[idx] = score
        cb_norm = normalize_scores(cb_raw_scores)

        # 4. --- Category Preference Score (Boost & Penalty Mask) ---
        category_boost_scores = np.zeros(len(self.all_product_ids))
        category_irrelevant_mask = np.zeros(len(self.all_product_ids), dtype=bool)

        if self.user_purchased_categories and not self.all_products.empty:
            for i, product_id in enumerate(self.all_product_ids):
                # Safely check if product exists in DataFrame
                product_filter = self.all_products[self.all_products['product_id'] == product_id]
                if not product_filter.empty:
                    product_category = product_filter.iloc[0]['category']
                    if product_category in self.user_purchased_categories:
                        category_boost_scores[i] = 1.0  
                    else:
                        category_irrelevant_mask[i] = True 
        
        category_boost_norm = normalize_scores(category_boost_scores)

        # 5. Behavioral Score (Based on Recent Views/Interactions)
        behavioral_scores = np.zeros(len(self.all_product_ids))
        if recent_behavior_ids:
            recent_indices = [self.i2idx[pid] for pid in recent_behavior_ids if pid in self.i2idx]
            for idx in recent_indices:
                if idx < len(behavioral_scores):
                    behavioral_scores[idx] = 1.0
        
        behavioral_norm = normalize_scores(behavioral_scores)

        # 6. --- Final Hybrid Score Combination (Weighted Sum) ---
        # Weights: CF (0.4) + CB (0.2) + Category Boost (0.3) + Behavior (0.1)
        hybrid_scores = (
            0.4 * cf_norm + 
            0.2 * cb_norm + 
            0.3 * category_boost_norm + 
            0.1 * behavioral_norm
        )
        
        # 7. --- Category Boost is sufficient, no need to penalize irrelevant items ---
        # Irrelevant items will just have a 0 boost, naturally ranking them below relevant ones.

        # 8. Exclude products the user has already purchased 
        hybrid_scores[purchased_indices] = -1.0

        # 9. Get top recommendations
        topk_indices = hybrid_scores.argsort()[-top_k:][::-1]
        
        recommendations = []
        for i in topk_indices:
            # Skip items that were explicitly excluded (already purchased, score = -1)
            if score < 0: 
                continue 
            
            if i not in self.idx2i:
                continue

            product_id = self.idx2i[i]
            
            # Check if the product exists in the DataFrame before accessing details
            product_filter = self.all_products[self.all_products['product_id'] == product_id]
            
            if product_filter.empty:
                continue # Skip if product details are missing

            product_info = product_filter.iloc[0]
            
            recommendations.append({
                'product_id': product_id,
                'title': product_info['name'],
                'score': score
            })

        return recommendations
