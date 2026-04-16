import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import OrderPage from "./pages/OrderPage/OrderPage";
import EventsPage from "./pages/EventsPage/events";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import CheckoutPage from "./pages/transactionpage/TransactionPage";
import CreateEvent from "./pages/CreateEvents/CreateEvents";
import ForgotPasswordPage from "./pages/forgot-password";
import ResetPasswordPage from "./pages/reset-password";
import ProfilePage from "./pages/profile";
import RequireAuth from "./components/RequireAuth";
import PaymentPage from "./pages/transaksi/TransaksiPage";
import AdminTransactionPage from "./pages/AdminTransactionPage/AdminTransactionPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/order/:eventId" element={<OrderPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/createevent" element={<CreateEvent />} />
      <Route path="/transactions/:id" element={<PaymentPage />} />
      <Route path="/verify" element={<AdminTransactionPage />} />

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