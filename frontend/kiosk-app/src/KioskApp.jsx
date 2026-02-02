import { useState, useEffect } from "react";
import "./App.css";
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import CartPage from "./pages/CartPage";
import ConfirmationPage from "./pages/ConfirmationPage";

function KioskApp() {
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState([]);
  const [orderNumber, setOrderNumber] = useState(null);
  const [orderType, setOrderType] = useState(null); // 'takeaway' or 'dine-in'

  // Auto-reset to home after 2 minutes of inactivity
  useEffect(() => {
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      if (page !== "home") {
        timeout = setTimeout(() => {
          setPage("home");
          setCart([]);
        }, 120000); // 2 minutes
      }
    };

    resetTimer();
    window.addEventListener("click", resetTimer);
    window.addEventListener("touchstart", resetTimer);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
    };
  }, [page]);

  const addToCart = (item) => {
    setCart((prev) => {
      // For customizable items, always add as new item (don't merge)
      if (item.customizations) {
        return [...prev, { ...item, quantity: 1, cartId: Date.now() }];
      }

      // For regular items, merge if same item exists
      const existing = prev.find((i) => i.id === item.id && !i.customizations);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && !i.customizations ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { ...item, quantity: 1, cartId: Date.now() }];
    });
  };

  const updateQuantity = (itemKey, quantity) => {
    if (quantity === 0) {
      setCart((prev) => prev.filter((i) => (i.cartId || i.id) !== itemKey));
    } else {
      setCart((prev) =>
        prev.map((i) => ((i.cartId || i.id) === itemKey ? { ...i, quantity } : i)),
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const placeOrder = async () => {
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: "kiosk-1",
          order_type: orderType,
          items: cart.map((item) => ({
            menu_item_id: item.id,
            quantity: item.quantity,
            price: item.price, // Include final price with customizations
            name: item.name, // For build-your-own items
            instructions: item.instructions || null,
            customizations: item.customizations || null,
            build_your_own: item.build_your_own || null,
          })),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setOrderNumber(data.order_number);
        setCart([]);
        setPage("confirmation");
      }
    } catch (error) {
      console.error("Order failed:", error);
      alert("Erreur lors de la commande");
    }
  };

  const goHome = () => {
    setPage("home");
    setCart([]);
    setOrderNumber(null);
    setOrderType(null);
  };

  const handleStartOrder = (type) => {
    setOrderType(type);
    setPage("menu");
  };

  return (
    <div className="app">
      {page === "home" && <HomePage onStart={handleStartOrder} />}
      {page === "menu" && (
        <MenuPage
          cart={cart}
          onAddToCart={addToCart}
          onViewCart={() => setPage("cart")}
          onBack={goHome}
        />
      )}
      {page === "cart" && (
        <CartPage
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onClear={clearCart}
          onBack={() => setPage("menu")}
          onCheckout={placeOrder}
        />
      )}
      {page === "confirmation" && (
        <ConfirmationPage orderNumber={orderNumber} onNewOrder={goHome} />
      )}
    </div>
  );
}

export default KioskApp;
