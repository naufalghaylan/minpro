import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import OrderPage from "./pages/OrderPage/OrderPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/order/:eventId" element={<OrderPage />} />
    </Routes>
  );
}

export default App;