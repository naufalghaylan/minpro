import { Link, NavLink, useNavigate } from "react-router-dom";
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
  const desktopNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative px-2 py-1 text-xs tracking-[0.18em] transition duration-300 after:absolute after:left-2 after:right-2 after:-bottom-0.5 after:h-px after:bg-amber-500/80 after:transition-transform after:duration-300 ${
      isActive
        ? "text-amber-700 after:scale-x-100"
        : "text-slate-700/85 after:scale-x-0 hover:text-amber-700 hover:after:scale-x-100"
    }`;
  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-xl border px-4 py-3 text-sm tracking-[0.12em] transition ${
      isActive
        ? "border-amber-400/50 bg-amber-100/40 text-amber-800 shadow-[0_10px_30px_-20px_rgba(217,119,6,0.6)]"
        : "border-slate-300/55 bg-white/35 text-slate-700 hover:border-amber-300/45 hover:bg-amber-50/70 hover:text-amber-800"
    }`;
  const desktopProfileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-full border py-1 pr-3 pl-1.5 text-xs transition ${
      isActive
        ? "border-amber-300/60 bg-amber-100/45 text-amber-800"
        : "border-slate-300/60 bg-white/45 text-slate-700 hover:border-amber-300/60 hover:text-amber-800"
    }`;

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
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/55 text-slate-900 shadow-[0_14px_42px_-28px_rgba(15,23,42,0.4)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(251,191,36,0.26),transparent_45%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.2),transparent_42%)]" />

        <div className="relative mx-auto flex w-full max-w-7xl items-center gap-3 px-3 py-3 sm:px-5 lg:px-8">
          <Link to="/" className="group shrink-0">
            <div className="flex items-center gap-3">
              <img 
                src="/animeku.id.svg" 
                alt="Animeku.id Logo" 
                className="h-10 w-auto transition group-hover:opacity-80"
              />
              <div>
                <p className="text-lg font-semibold leading-none tracking-[0.24em] text-slate-900 transition group-hover:text-amber-800 sm:text-xl">
                  ANIMEKU.ID
                </p>
                <p className="mt-1 text-[10px] tracking-[0.28em] text-slate-600/85 uppercase">
                  Curated Event Experience
                </p>
              </div>
            </div>
          </Link>

          <div className="hidden lg:ml-auto lg:flex lg:items-center lg:gap-5">
            <nav className="flex items-center rounded-full border border-white/75 bg-white/45 px-4 py-1.5 backdrop-blur-md shadow-[0_12px_32px_-24px_rgba(30,41,59,0.4)]">
              <NavLink to="/" end className={desktopNavLinkClass}>
                HOME
              </NavLink>
              <NavLink to="/events" className={desktopNavLinkClass}>
                EVENTS
              </NavLink>

              {user?.role === "EVENT_ORGANIZER" && (
                <>
                  <NavLink to="/createevent" className={desktopNavLinkClass}>
                    BUAT EVENT
                  </NavLink>
                  <NavLink to="/organizer/dashboard" className={desktopNavLinkClass}>
                    DASHBOARD EO
                  </NavLink>
                  <NavLink to="/vouchers" className={desktopNavLinkClass}>
                    VOUCHER
                  </NavLink>
                </>
              )}

              {user?.role === "CUSTOMER" && (
                <>
                  <NavLink to="/checkout" className={desktopNavLinkClass}>
                    TRANSAKSI
                  </NavLink>
                  <NavLink to="/myticket" className={desktopNavLinkClass}>
                    MY TICKET
                  </NavLink>
                </>
              )}
            </nav>

            {!user && (
              <Link
                to="/login"
                className="rounded-full border border-amber-300/65 bg-linear-to-r from-amber-200/90 to-amber-400/90 px-5 py-2 text-xs font-semibold tracking-[0.18em] text-slate-900 shadow-[0_8px_30px_-14px_rgba(251,191,36,0.75)] transition hover:brightness-105"
              >
                LOGIN
              </Link>
            )}

            {user && (
              <div className="flex items-center gap-3">
                <NavLink
                  to="/profile"
                  className={desktopProfileLinkClass}
                >
                  <div className="h-8 w-8 rounded-full border border-slate-300/60 bg-linear-to-br from-slate-100/70 via-white/65 to-amber-100/75 overflow-hidden">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={user.name || 'User'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold tracking-wide text-amber-800">
                        {avatarLabel(user.name)}
                      </div>
                    )}
                  </div>
                  <span className="max-w-28 truncate tracking-[0.08em] uppercase">
                    {user.name || "Profile"}
                  </span>
                </NavLink>

                <button
                  onClick={handleLogout}
                  className="rounded-full border border-rose-300/45 bg-rose-100/45 px-4 py-2 text-xs font-medium tracking-[0.13em] text-rose-700 transition hover:border-rose-400/60 hover:bg-rose-100/75"
                >
                  LOGOUT
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`fixed top-3 right-3 z-60 rounded-full border border-slate-300/70 bg-white/75 p-2.5 text-slate-700 shadow-[0_14px_34px_-18px_rgba(15,23,42,0.55)] backdrop-blur-md transition hover:border-amber-300/55 hover:text-amber-700 sm:top-4 sm:right-4 lg:hidden ${
              mobileMenuOpen ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
            title="Buka menu"
            aria-label="Buka menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <div
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <div
        className={`fixed top-0 right-0 z-50 h-screen w-screen overflow-y-auto border-l border-white/70 bg-white/72 text-slate-900 shadow-[-18px_0_44px_-30px_rgba(15,23,42,0.45)] backdrop-blur-2xl transform transition-transform duration-300 ease-out sm:w-80 sm:max-w-[86vw] lg:hidden ${
          mobileMenuOpen
            ? "translate-x-0 visible pointer-events-auto"
            : "translate-x-[110%] invisible pointer-events-none"
        }`}
      >
        <div className="sticky top-0 border-b border-white/80 bg-white/75 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-[0.18em] text-slate-900 uppercase">Premium Menu</h2>
              <p className="mt-1 text-[11px] tracking-[0.2em] text-slate-600/90 uppercase">Event Access</p>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-full border border-slate-300/65 bg-white/70 p-2 text-slate-700 transition hover:border-amber-300/50 hover:text-amber-700"
              title="Tutup menu"
              aria-label="Tutup menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="flex flex-col gap-2 p-4">
          {user && (
            <div className="mb-2 rounded-2xl border border-slate-200/70 bg-white/55 p-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full border border-slate-200/75 bg-linear-to-br from-slate-100/80 via-white/75 to-amber-100/80 overflow-hidden shrink-0">
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={user.name || 'User'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-amber-800">
                      {avatarLabel(user.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-wide text-slate-900">
                    {user.name || "User"}
                  </p>
                  <p className="truncate text-xs text-slate-600">
                    {user.email || "email@gmail.com"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <NavLink to="/" end onClick={handleMobileMenuClose} className={mobileNavLinkClass}>
            HOME
          </NavLink>

          <NavLink to="/events" onClick={handleMobileMenuClose} className={mobileNavLinkClass}>
            EVENTS
          </NavLink>

          {user?.role === "EVENT_ORGANIZER" && (
            <>
              <NavLink to="/createevent" onClick={handleMobileMenuClose} className={mobileNavLinkClass}>
                BUAT EVENT
              </NavLink>

              <NavLink to="/organizer/dashboard" onClick={handleMobileMenuClose} className={mobileNavLinkClass}>
                DASHBOARD EO
              </NavLink>

              <NavLink to="/vouchers" onClick={handleMobileMenuClose} className={mobileNavLinkClass}>
                VOUCHER
              </NavLink>
            </>
          )}

          {user?.role === "CUSTOMER" && (
            <>
              <NavLink to="/checkout" onClick={handleMobileMenuClose} className={mobileNavLinkClass}>
                TRANSAKSI
              </NavLink>

              <NavLink to="/myticket" onClick={handleMobileMenuClose} className={mobileNavLinkClass}>
                MY TICKET
              </NavLink>
            </>
          )}

          {user && (
            <>
              <NavLink to="/profile" onClick={handleMobileMenuClose} className={mobileNavLinkClass}>
                PROFILE
              </NavLink>

              <button
                onClick={handleLogout}
                className="mt-2 w-full rounded-xl border border-rose-300/45 bg-rose-100/45 px-4 py-3 text-left text-sm tracking-[0.12em] text-rose-700 transition hover:border-rose-400/60 hover:bg-rose-100/80"
              >
                LOGOUT
              </button>
            </>
          )}

          {!user && (
            <NavLink
              to="/login"
              onClick={handleMobileMenuClose}
              className={({ isActive }) =>
                `mt-2 rounded-xl border bg-linear-to-r px-4 py-3 text-center text-sm font-semibold tracking-[0.15em] text-slate-900 transition ${
                  isActive
                    ? "border-amber-400/70 from-amber-200 to-amber-400 shadow-[0_12px_30px_-20px_rgba(217,119,6,0.7)]"
                    : "border-amber-300/55 from-amber-100/90 to-amber-300/90 hover:brightness-105"
                }`
              }
            >
              LOGIN
            </NavLink>
          )}
        </nav>
      </div>
    </>
  );
}