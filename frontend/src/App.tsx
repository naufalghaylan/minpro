import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import OrderPage from "./pages/OrderPage/OrderPage";
import EventsPage from "./pages/EventsPage/events";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/order/:eventId" element={<OrderPage />} />
      <Route path="/events" element={<EventsPage />} />
    </Routes>
  );
}

export default App;