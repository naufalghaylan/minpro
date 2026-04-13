import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import OrderPage from "./pages/OrderPage/OrderPage";
import EventsPage from "./pages/EventsPage/events";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/order/:eventId" element={<OrderPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
}

export default App;