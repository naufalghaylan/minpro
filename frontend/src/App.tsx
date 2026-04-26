import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import OrderPage from "./pages/OrderPage/OrderPage";
import EventsPage from "./pages/EventsPage/events";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import CheckoutPage from "./pages/checkout/checkout";
import ForgotPasswordPage from "./pages/forgot-password";
import ResetPasswordPage from "./pages/reset-password";
import ProfilePage from "./pages/profile";
import RequireAuth from "./components/RequireAuth";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/order/:eventId"
        element={
          <RequireAuth allowedRoles={["CUSTOMER"]}>
            <OrderPage />
          </RequireAuth>
        }
      />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/checkout"
        element={
          <RequireAuth allowedRoles={["CUSTOMER"]}>
            <CheckoutPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;