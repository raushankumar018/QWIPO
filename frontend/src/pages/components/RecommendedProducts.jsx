import React, { useEffect, useState } from 'react';
import ProductCard from './ProductCard'; // Import the ProductCard component
import './css/RecommendedProducts.css'; // Create this CSS file for styling
import axios from 'axios'

const RecommendedProducts = () => {

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const [recommendedItems, setRecommendedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE}/api/recommendations/gpt-recommendation`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        console.log(response.data)
        setRecommendedItems(response.data.items);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [ ]);

  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (recommendedItems.length === 0) {
    return null; 
  }
  return (
    <div className="recommended-products my-5">
      <h4 className="mb-4 text-center fw-bold " style={{ color: "#178573ff", marginTop: "100px" }}>You might also like</h4>
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 ">
        {recommendedItems.map((product) => (
          <div className="col" key={product.id}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendedProducts;


