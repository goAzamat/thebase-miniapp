import { useState, useEffect } from 'react';
import Telegram from '@twa-dev/sdk';
import products from './products'; // импортируем список
import ProductCard from "./components/ProductCard.jsx"; // добавили
import './App.css';

function App() {
  useEffect(() => {
    Telegram.ready();
    Telegram.MainButton.setText("Add to Cart");
    Telegram.MainButton.show();
  }, []);

  return (
    <div style={{
      padding: '40px',
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      <h1>Welcome to The Base 🧋</h1>
      <p>Your Telegram Mini App is running!</p>
      {products.map((product) => (
  <ProductCard
    key={product.id}
    title={product.title}
    description={product.description}
    price={product.price}
  />
))}

      <ProductCard 
        title="Matcha Cream Base" 
        description="Premium matcha blend for drinks & desserts" 
        price={35}
      />
    </div>
  );
}

export default App;