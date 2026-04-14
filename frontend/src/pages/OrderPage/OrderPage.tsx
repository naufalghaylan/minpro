import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/navbar";
import api from "../../api"; // 🔥 pakai api instance
import { useAuthStore } from "../../store/auth";

export default function OrderPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  // 🔥 ambil dari zustand
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [event, setEvent] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${eventId}`);
        setEvent(res.data);
      } catch (error) {
        console.error("ERROR FETCH EVENT:", error);
      }
    };

    if (eventId) fetchEvent();
  }, [eventId]);

  const handleOrder = async () => {

    if (!token) {
      alert("HARAP LOGIN TERLEBIH DAHULU");
      navigate("/login");
      return;
    }

    if (!quantity || quantity < 1) {
      alert("Minimal beli 1 ticket!");
      return;
    }

    try {
      await api.post(`/orders/${eventId}`, { quantity }, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

      alert("Order berhasil! silahkan cek halaman transaksi.");
      navigate("/"); // opsional redirect
    } catch (err: any) {
      console.error("ORDER ERROR:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Gagal order");
    }
  };

  if (!event) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div>
      <Header />
      <div className="min-h-screen flex">
        
        {/* LEFT IMAGE */}
        <div className="w-1/2 hidden md:block">
          <img
            src={event.event_images?.[0]?.url}
            className="w-full h-full object-fill"
          />
        </div>

        {/* RIGHT */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-10">
          <div className="w-full max-w-md">

            <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
            <p className="text-gray-500 mb-6">Checkout Ticket</p>

            {/* 🔥 tampilkan user */}
            {user && (
              <p className="text-sm mb-4">
                Login sebagai: <b>{user.name}</b>
              </p>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-500">Harga</p>
              <p className="text-lg font-semibold">Rp {event.price}</p>
            </div>

            <div className="mb-4">
              <label className="text-sm">Jumlah Ticket</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => {
                  let val = Number(e.target.value);
                  if (!val || val < 1) val = 1;
                  setQuantity(val);
                }}
                className="w-full border p-2 rounded mt-1"
              />
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold">
                Rp {event.price * quantity}
              </p>
            </div>

            <button
              onClick={handleOrder}
              className="w-full py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
            >
              Checkout
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}