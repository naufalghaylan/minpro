import { AnimatePresence, motion } from "framer-motion";
import { Routes, Route, useLocation } from "react-router-dom";
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
import RequireRole from "./components/RequireRole";
import PaymentPage from "./pages/transaksi/TransaksiPage";
import AdminTransactionPage from "./pages/AdminTransactionPage/AdminTransactionPage";
import VoucherPage from "./pages/VoucherPage/VoucherPage";
import MyTicketsPage from "./pages/mytickets/mytickets";
import TicketDetailPage from "./pages/TicketDetailPage/TicketDetailPage";
import OrganizerDashboardPage from "./pages/OrganizerDashboardPage/OrganizerDashboardPage";

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
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
            path="/createevent"
            element={
              <RequireAuth>
                <RequireRole allow={["EVENT_ORGANIZER"]}>
                  <CreateEvent />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route path="/transactions/:id" element={<PaymentPage />} />
          <Route path="/verify" element={<AdminTransactionPage />} />
          <Route
            path="/organizer"
            element={
              <RequireAuth>
                <RequireRole allow={["EVENT_ORGANIZER"]}>
                  <OrganizerDashboardPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/organizer/dashboard"
            element={
              <RequireAuth>
                <RequireRole allow={["EVENT_ORGANIZER"]}>
                  <OrganizerDashboardPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/vouchers"
            element={
              <RequireAuth>
                <RequireRole allow={["EVENT_ORGANIZER"]}>
                  <VoucherPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route path="/myticket" element={<MyTicketsPage />} />
          <Route path="/ticketdetail/:id" element={<TicketDetailPage />} />

          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default App;