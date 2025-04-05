// src/components/ProductCard.jsx

function ProductCard({ title, description, price }) {
  const handleClick = () => {
    if (window.Telegram && window.Telegram.MainButton) {
      window.Telegram.MainButton.setText("Add to Cart");
      window.Telegram.MainButton.show();
      window.Telegram.sendData(JSON.stringify({ title, price }));
    } else {
      console.log("Telegram SDK не доступен");
    }
  };

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
        textAlign: "left",
        fontFamily: "sans-serif",
      }}
    >
      <h3>{title}</h3>
      <p>{description}</p>
      <strong>{price} AED</strong>
      <br />
      <button
        style={{
          marginTop: "10px",
          padding: "8px 16px",
          backgroundColor: "#0d6efd",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        onClick={handleClick}
      >
        Add to Cart
      </button>
    </div>
  );
}

export default ProductCard;