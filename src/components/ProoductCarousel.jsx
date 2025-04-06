import React from 'react';
import { useParams, Link } from 'react-router-dom';

const ProductCarousel = () => {
  const { line } = useParams();

  // Импортируем все изображения из нужной папки
  const importAll = (r) => r.keys().map(r);
  let images = [];

  try {
    images = importAll(
      require.context(`../assets/${line.toLowerCase()}`, false, /\.(png|jpe?g|svg)$/)
    );
  } catch (e) {
    console.error("Error loading images for line:", line);
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <Link to="/" className="text-blue-400 underline block mb-4">← Back</Link>
      <h1 className="text-2xl font-bold mb-4">{line.replace(/-/g, ' ')}</h1>
      <div className="flex overflow-x-auto gap-4">
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`Slide ${idx}`}
            className="w-64 rounded-xl shadow-md"
          />
        ))}
      </div>
    </div>
  );
};

export default ProductCarousel;