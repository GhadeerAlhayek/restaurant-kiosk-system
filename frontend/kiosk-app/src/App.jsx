import { BrowserRouter, Routes, Route } from "react-router-dom";
import KioskApp from "./KioskApp";
import AdminPage from "./pages/admin/AdminPage";
import KitchenPage from "./pages/kitchen/KitchenPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<KioskApp />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
