import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ProductCarousel from './components/ProductCarousel';

const productLines = [
  'Chai-Latte', 'Chocolate', 'Cordial', 'Cream-Latte', 'Frappe', 'Garnish', 'Iced-Tea',
  'Jam', 'Matcha', 'Milkshake', 'Raf', 'Sugar-Free', 'Sugar-Syrup',
  'Tea', 'Topping', 'Vending'
];

function App() {
  return (
    <Router>
      <div className="bg-black text-white min-h-screen p-4">
        <Routes>
          <Route path="/" element={
            <div className="grid grid-cols-2 gap-4">
              {productLines.map((line) => (
                <Link
                  key={line}
                  to={`/${line}`}
                  className="bg-white text-black p-4 rounded-xl text-center text-sm font-medium hover:bg-gray-200 transition"
                >
                  {line.replace(/-/g, ' ')}
                </Link>
              ))}
            </div>
          } />
          <Route path="/:line" element={<ProductCarousel />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;