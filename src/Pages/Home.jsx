// src/pages/Home.jsx

import { Link } from "react-router-dom";
import products from "../data/products";

function Home() {
  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Choose a Product Line</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {products.map((product) => (
          <Link
            to={`/product/${product.id}`}
            key={product.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
              background: '#f4f4f4',
              padding: 12,
              borderRadius: 10,
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
          >
            <img
              src={`/images/${product.folder}/1.png`}
              alt={product.title}
              style={{ width: '100%', borderRadius: 8, marginBottom: 8 }}
            />
            <strong style={{ color: '#333', textAlign: 'center' }}>{product.title}</strong>
            <p style={{ color: '#666', fontSize: 12, textAlign: 'center' }}>{product.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;