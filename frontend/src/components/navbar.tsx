import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { Menu, X } from "lucide-react";
import api from "../api";

const avatarLabel = (name?: string | null) => {
  if (!name) {
    return 'U';
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Close mobile menu when clicking on a link
  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // tetap lanjut bersihkan state lokal
      }
    }

    logout();
    setMobileMenuOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <>
      {/* DESKTOP & MOBILE NAVBAR */}
      <header className="sticky top-0 w-full bg-white shadow-md px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center gap-4 z-40">
        <Link to="/" className="logo-3d text-xl sm:text-2xl text-blue-800 font-bold tracking-widest shrink-0">
          ANIMEKU.ID
        </Link>

        <div className="hidden lg:flex items-center gap-6 ml-auto">
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="hover:text-blue-600 transition">
              HOME
            </Link>

            <Link to="/events" className="hover:text-blue-600 transition">
              EVENTS
            </Link>

            {user?.role === "EVENT_ORGANIZER" && (
              <>
                <Link to="/createevent" className="hover:text-blue-600 transition">
                  BUAT EVENT
                </Link>

                <Link to="/organizer/dashboard" className="hover:text-blue-600 transition">
                  DASHBOARD EO
                </Link>

                <Link to="/vouchers" className="hover:text-blue-600 transition">
                  VOUCHER
                </Link>
              </>
            )}

            {user?.role === "CUSTOMER" && (
              <>
                <Link to="/checkout" className="hover:text-blue-600 transition">
                  TRANSAKSI
                </Link>
                <Link to="/myticket" className="hover:text-blue-600 transition">
                  MY TICKET
                </Link>
              </>
            )}
          </nav>

          {!user && (
            <Link
              to="/login"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              LOGIN
            </Link>
          )}

          {user && (
            <>
              <Link
                to="/profile"
                className="inline-flex items-center text-sm font-medium text-slate-700 transition hover:text-blue-600"
              >
                PROFILE
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center text-sm font-medium text-red-500 transition hover:text-red-600"
              >
                LOGOUT
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="ml-auto lg:ml-0 lg:hidden p-2 rounded hover:bg-gray-100 transition"
          title="Buka menu"
          aria-label="Buka menu"
        >
          <Menu size={20} />
        </button>
      </header>

      <div
        className={`fixed top-0 right-0 h-screen w-72 max-w-[80vw] bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 lg:hidden overflow-y-auto ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">MENU</h2>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded hover:bg-gray-100 transition"
            title="Tutup menu"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col p-4 space-y-2">
          {user && (
            <div className="pb-4 border-b">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-linear-to-br from-slate-100 via-blue-50 to-amber-100 overflow-hidden shrink-0">
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={user.name || 'User'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center font-semibold text-sm text-slate-500">
                      {avatarLabel(user.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate text-sm">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email || "email@gmail.com"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Link
            to="/"
            onClick={handleMobileMenuClose}
            className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
          >
            HOME
          </Link>

          <Link
            to="/events"
            onClick={handleMobileMenuClose}
            className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
          >
            EVENTS
          </Link>

          {user?.role === "EVENT_ORGANIZER" && (
            <>
              <Link
                to="/createevent"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
              >
                BUAT EVENT
              </Link>

              <Link
                to="/organizer/dashboard"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
              >
                DASHBOARD EO
              </Link>

              <Link
                to="/vouchers"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
              >
                VOUCHER
              </Link>
            </>
          )}

          {user?.role === "CUSTOMER" && (
            <>
              <Link
                to="/checkout"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
              >
                TRANSAKSI
              </Link>

              <Link
                to="/myticket"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
              >
                MY TICKET
              </Link>
            </>
          )}

          {user && (
            <>
              <Link
                to="/profile"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
              >
                PROFILE
              </Link>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 rounded transition font-medium mt-2 border-t"
              >
                LOGOUT
              </button>
            </>
          )}

          {!user && (
            <Link
              to="/login"
              onClick={handleMobileMenuClose}
              className="px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium text-center"
            >
              LOGIN
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}