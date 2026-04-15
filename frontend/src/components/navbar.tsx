import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../store/auth";

export default function Header() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <header className="w-full bg-white shadow-md px-6 py-4 flex justify-between items-center">
      
      {/* LEFT LOGO */}

        <Link to="/" className="logo-3d text-2xl text-blue-800 font-bold tracking-widest">
          ANIMEKU.ID
        </Link>



      {/* RIGHT MENU */}
      <nav className="flex items-center gap-6 text-sm font-medium relative">
        
        <Link to="/" className="hover:text-blue-600">
          HOME
        </Link>

        <Link to="/events" className="hover:text-blue-600">
          EVENTS
        </Link>

        {/* 🔥 KHUSUS EVENT ORGANIZER */}
        {user?.role === "EVENT_ORGANIZER" && (
          <>
            <Link to="/createevent" className="hover:text-blue-600">
              BUAT EVENT
            </Link>

            <Link to="/verify" className="hover:text-blue-600">
              VERIFIKASI PEMBELIAN
            </Link>
          </>
        )}

        {/* ❌ Kalau belum login */}
        {!user && (
          <Link
            to="/login"
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
          >
            LOGIN
          </Link>
        )}

        {/* ✅ Kalau sudah login */}
        {user && (
          <>
            {/* 🔥 CHECKOUT LINK */}
            <Link to="/checkout" className="hover:text-blue-600">
              CHECKOUT
            </Link>

            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
              >
                ☰
              </button>

              {open && (
                <div className="absolute right-0 mt-3 w-64 bg-white border rounded shadow-lg z-50">
                  
                  {/* PROFILE */}
                  <div className="p-4 border-b">
                    <p className="font-semibold">
                      {user.name || "User"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user.email || "email@gmail.com"}
                    </p>
                  </div>

                  {/* MENU */}
                  <ul className="p-2">
                    <li className="p-2 hover:bg-gray-100 cursor-pointer">
                      <Link to="/profile">Profile</Link>
                    </li>

                    {user.role === "EVENT_ORGANIZER" && (
                      <li className="p-2 hover:bg-gray-100 cursor-pointer">
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
          </>
        )}
      </nav>
    </header>
  );
}