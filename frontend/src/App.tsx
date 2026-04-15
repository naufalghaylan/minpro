import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import OrderPage from "./pages/OrderPage/OrderPage";
import EventsPage from "./pages/EventsPage/events";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import CheckoutPage from "./pages/checkout/checkout";
import CreateEvent from "./pages/CreateEvents/CreateEvents";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/order/:eventId" element={<OrderPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/createevent" element={<CreateEvent />} />
    </Routes>
  );
}

export default App;