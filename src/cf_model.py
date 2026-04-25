# cf_model.py
from sklearn.decomposition import TruncatedSVD
import numpy as np
import scipy.sparse as sps

class CFModel:
    def __init__(self, n_factors=10):
        self.n_factors = n_factors
        self.model = None
        self.item_factors = None
        self.user_item_matrix = None # Store the original matrix
        self.num_items = 0
        self.num_users = 0

    def fit(self, item_user_matrix):
        # Transpose to get User-Item matrix (U x I)
        self.user_item_matrix = item_user_matrix.T.tocsr() 
        self.num_users, self.num_items = self.user_item_matrix.shape
        n_factors = min(self.n_factors, min(self.user_item_matrix.shape))
        self.model = TruncatedSVD(n_components=n_factors, random_state=42)
        
        # Fit the model on the User-Item matrix
        self.model.fit(self.user_item_matrix)
        self.item_factors = self.model.components_ # Item Factors (K x I)

    def recommend_for_user(self, user_index, N=50):
        if self.model is None or self.user_item_matrix is None:
            raise ValueError('CF model not fitted.')
        
        if user_index >= self.num_users or user_index < 0:
            print(f"Warning: User index {user_index} out of bounds.")
            return [] # Cannot recommend if user index is invalid

        # 1. Get the user's vector (1 x I)
        user_vector_raw = self.user_item_matrix.getrow(user_index)
        
        # 2. Transform the user's interaction vector to the latent space (1 x K)
        user_vector_transformed = self.model.transform(user_vector_raw)
        
        # 3. Calculate scores for all items: (1 x K) dot (K x I) => (1 x I)
        # item_factors is (K x I). We need to transpose it: item_factors.T is (I x K)
        # User vector (1 x K) dot item factors (K x I)
        scores = user_vector_transformed.dot(self.item_factors)
        
        # 4. Sort and get top N recommendations
        scores = scores.ravel() # Flatten to 1D array
        top_idx = scores.argsort()[::-1][:N]
        
        # Return index (product index in the matrix) and score
        return list(zip(top_idx, scores[top_idx]))
