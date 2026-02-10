import { useState, useEffect } from "react";
import "./App.css";
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import CustomizePage from "./pages/CustomizePage";
import CartPage from "./pages/CartPage";
import ConfirmationPage from "./pages/ConfirmationPage";

function KioskApp() {
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState([]);
  const [orderNumber, setOrderNumber] = useState(null);
  const [orderType, setOrderType] = useState(null); // 'takeaway' or 'dine-in'
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [pendingItemForExtras, setPendingItemForExtras] = useState(null);

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
    setSelectedItem(null);
    setSelectedCategory(null);
  };

  const handleStartOrder = (type) => {
    setOrderType(type);
    setPage("menu");
  };

  const handleCustomizeItem = (item, category) => {
    setSelectedItem(item);
    setSelectedCategory(category);
    setPage("customize");
  };

  const handleCustomizeComplete = (customizedItem) => {
    // Check if category should show supplements
    if (selectedCategory?.show_supplements) {
      // Go back to menu and show extras modal
      setPendingItemForExtras(customizedItem);
      setSelectedItem(null);
      setSelectedCategory(null);
      setPage("menu");
    } else {
      // No supplements, add directly to cart
      addToCart(customizedItem);
      setSelectedItem(null);
      setSelectedCategory(null);
      setPage("menu");
    }
  };

  const handleCustomizeBack = () => {
    setSelectedItem(null);
    setSelectedCategory(null);
    setPage("menu");
  };

  return (
    <div className="app">
      {page === "home" && <HomePage onStart={handleStartOrder} />}
      {page === "menu" && (
        <MenuPage
          cart={cart}
          onAddToCart={addToCart}
          onCustomize={handleCustomizeItem}
          onViewCart={() => setPage("cart")}
          onBack={goHome}
          pendingItemForExtras={pendingItemForExtras}
          onExtrasComplete={() => setPendingItemForExtras(null)}
        />
      )}
      {page === "customize" && selectedItem && selectedCategory && (
        <CustomizePage
          selectedItem={selectedItem}
          category={selectedCategory}
          onComplete={handleCustomizeComplete}
          onBack={handleCustomizeBack}
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
