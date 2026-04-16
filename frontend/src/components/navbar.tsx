import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { Menu, X } from "lucide-react";

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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
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

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <>
      {/* DESKTOP & MOBILE NAVBAR */}
      <header className="sticky top-0 w-full bg-white shadow-md px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex justify-between items-center relative z-40">
        
        {/* LEFT LOGO */}
        <Link to="/" className="logo-3d text-xl sm:text-2xl text-blue-800 font-bold tracking-widest shrink-0">
          ANIMEKU.ID
        </Link>

        {/* DESKTOP MENU */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          
          <Link to="/" className="hover:text-blue-600 transition">
            HOME
          </Link>

          <Link to="/events" className="hover:text-blue-600 transition">
            EVENTS
          </Link>

          {user?.role === "EVENT_ORGANIZER" && (
            <>
              <Link to="/create-event" className="hover:text-blue-600 transition">
                BUAT EVENT
              </Link>

              <Link to="/verify" className="hover:text-blue-600 transition">
                VERIFIKASI PEMBELIAN
              </Link>
            </>
          )}

          {!user && (
            <Link
              to="/login"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              LOGIN
            </Link>
          )}

          {user && (
            <>
              <Link to="/checkout" className="hover:text-blue-600 transition">
                CHECKOUT
              </Link>

              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 transition"
                >
                  ☰
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white border rounded shadow-lg z-50">
                    
                    {/* PROFILE CARD */}
                    <div className="p-4 border-b">
                      <div className="flex items-center gap-3">
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
                          <p className="font-semibold truncate">
                            {user.name || "User"}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {user.email || "email@gmail.com"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* DROPDOWN MENU */}
                    <ul className="p-2">
                      <li
                        className="p-2 hover:bg-gray-100 cursor-pointer rounded transition"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          navigate("/profile");
                        }}
                      >
                        Profile
                      </li>

                      {user.role === "EVENT_ORGANIZER" && (
                        <li className="p-2 hover:bg-gray-100 cursor-pointer rounded transition">
                          <Link to="/dashboard-eo">Dashboard EO</Link>
                        </li>
                      )}

                      <li>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-2 py-2 hover:bg-gray-100 text-red-500 rounded transition"
                        >
                          Logout
                        </button>
                      </li>
                    </ul>

                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* MOBILE HAMBURGER BUTTON */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden shrink-0 p-2 rounded hover:bg-gray-100 transition"
          title={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
          aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
        >
          {mobileMenuOpen ? (
            <X size={24} className="text-gray-800" />
          ) : (
            <Menu size={24} className="text-gray-800" />
          )}
        </button>
      </header>

      {/* MOBILE MENU BACKDROP */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* MOBILE SIDEBAR MENU */}
      <div
        className={`fixed top-0 right-0 h-screen w-72 max-w-[80vw] bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 lg:hidden overflow-y-auto ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* CLOSE BUTTON */}
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

        {/* MOBILE MENU CONTENT */}
        <nav className="flex flex-col p-4 space-y-2">
          
          {/* PROFILE SECTION - Only for logged in users */}
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

          {/* NAVIGATION LINKS */}
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
                to="/create-event"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
              >
                BUAT EVENT
              </Link>

              <Link
                to="/verify"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
              >
                VERIFIKASI PEMBELIAN
              </Link>
            </>
          )}

          {user && (
            <>
              <Link
                to="/checkout"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
              >
                CHECKOUT
              </Link>

              <Link
                to="/profile"
                onClick={handleMobileMenuClose}
                className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
              >
                PROFILE
              </Link>

              {user.role === "EVENT_ORGANIZER" && (
                <Link
                  to="/dashboard-eo"
                  onClick={handleMobileMenuClose}
                  className="px-4 py-3 text-gray-800 hover:bg-blue-50 rounded transition font-medium"
                >
                  DASHBOARD EO
                </Link>
              )}

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