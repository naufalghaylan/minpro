import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../store/auth";

export default function Header() {
  const [open, setOpen] = useState(false); // dropdown profile
  const [mobileMenu, setMobileMenu] = useState(false); // 🔥 mobile menu
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    setOpen(false);
    setMobileMenu(false);
    navigate("/", { replace: true });
  };

  return (
    <header className="w-full bg-white shadow-md px-4 md:px-6 py-4 flex justify-between items-center">

      {/* LOGO */}
      <Link to="/" className="text-xl md:text-2xl text-blue-800 font-bold tracking-widest">
        ANIMEKU.ID
      </Link>

      {/* 🔥 HAMBURGER (MOBILE ONLY) */}
      <button
        className="md:hidden text-2xl"
        onClick={() => setMobileMenu(!mobileMenu)}
      >
        ☰
      </button>

      {/* 🔥 MENU DESKTOP */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium relative">
        
        <Link to="/" className="hover:text-blue-600">HOME</Link>
        <Link to="/events" className="hover:text-blue-600">EVENTS</Link>

        {user?.role === "CUSTOMER" && (
          <>
            <Link to="/checkout">TRANSAKSI</Link>
            <Link to="/myticket">MY TICKET</Link>
          </>
        )}

        {user?.role === "EVENT_ORGANIZER" && (
          <>
            <Link to="/createevent">BUAT EVENT</Link>
            <Link to="/verify">VERIFIKASI</Link>
            <Link to="/vouchers">VOUCHER</Link>
          </>
        )}

        {!user && (
          <Link
            to="/login"
            className="bg-blue-600 text-white px-4 py-1 rounded"
          >
            LOGIN
          </Link>
        )}

        {/* PROFILE DROPDOWN */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="bg-gray-200 px-3 py-1 rounded"
            >
              ☰
            </button>

            {open && (
              <div className="absolute right-0 mt-3 w-64 bg-white border rounded shadow-lg z-50">
                <div className="p-4 border-b">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>

                <ul className="p-2">
                  <li
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setOpen(false);
                      navigate("/profile");
                    }}
                  >
                    Profile
                  </li>

                  {user.role === "EVENT_ORGANIZER" && (
                    <li className="p-2 hover:bg-gray-100">
                      <Link to="/dashboard-eo">Dashboard EO</Link>
                    </li>
                  )}

                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-2 py-2 hover:bg-gray-100 text-red-500"
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* 🔥 MOBILE MENU */}
      {mobileMenu && (
        <div className="absolute top-[70px] left-0 w-full bg-white shadow-md p-4 flex flex-col gap-4 md:hidden z-50">

          <Link to="/" onClick={() => setMobileMenu(false)}>HOME</Link>
          <Link to="/events" onClick={() => setMobileMenu(false)}>EVENTS</Link>

          {user?.role === "CUSTOMER" && (
            <>
              <Link to="/checkout" onClick={() => setMobileMenu(false)}>TRANSAKSI</Link>
              <Link to="/myticket" onClick={() => setMobileMenu(false)}>MY TICKET</Link>
            </>
          )}

          {user?.role === "EVENT_ORGANIZER" && (
            <>
              <Link to="/createevent" onClick={() => setMobileMenu(false)}>BUAT EVENT</Link>
              <Link to="/verify" onClick={() => setMobileMenu(false)}>VERIFIKASI</Link>
              <Link to="/vouchers" onClick={() => setMobileMenu(false)}>VOUCHER</Link>
            </>
          )}

          {!user && (
            <Link
              to="/login"
              onClick={() => setMobileMenu(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-center"
            >
              LOGIN
            </Link>
          )}

          {user && (
            <>
              <div className="border-t pt-2">
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>

              <button
                onClick={() => {
                  setMobileMenu(false);
                  navigate("/profile");
                }}
                className="text-left"
              >
                Profile
              </button>

              <button
                onClick={handleLogout}
                className="text-left text-red-500"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}