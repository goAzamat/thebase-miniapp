// src/pages/Product.jsx

import { useParams, useNavigate } from "react-router-dom";
import products from "../data/products";
import Carousel from "../components/Carousel";

function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = products.find((p) => p.id === id);

  if (!product) return <div>Product not found.</div>;

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back</button>
      <h2 style={{ textAlign: 'center', marginBottom: 12 }}>{product.title}</h2>
      <p style={{ textAlign: 'center', fontSize: 14, color: '#444', marginBottom: 16 }}>{product.text}</p>
      <Carousel folder={product.folder} images={product.images} />
    </div>
  );
}

export default Product;
