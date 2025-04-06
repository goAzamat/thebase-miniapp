// src/components/Carousel.jsx

import { useState } from "react";

function Carousel({ folder, images }) {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div style={{ textAlign: "center" }}>
      <img
        src={`/images/${folder}/${images[index]}`}
        alt={`Slide ${index + 1}`}
        style={{ width: "100%", maxWidth: 320, borderRadius: 12 }}
      />
      <div style={{ marginTop: 12 }}>
        <button onClick={prev} style={btnStyle}>◀</button>
        <span style={{ margin: '0 12px' }}>{index + 1} / {images.length}</span>
        <button onClick={next} style={btnStyle}>▶</button>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "8px 16px",
  fontSize: 16,
  border: "none",
  background: "#eee",
  borderRadius: 6,
  cursor: "pointer"
};

export default Carousel;