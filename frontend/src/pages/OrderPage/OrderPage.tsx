import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/navbar";
import api from "../../api";
import { useAuthStore } from "../../store/auth";

export default function OrderPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [event, setEvent] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const BASE_URL = "http://localhost:3000";

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${eventId}`);
        console.log("EVENT:", res.data); // 🔥 debug
        setEvent(res.data.data);
        console.log("RES.DATA:", res.data);
console.log("EVENT:", event);
console.log("IMAGES:", event?.event_images);
      } catch (error) {
        console.error("ERROR FETCH EVENT:", error);
      }
    };

    if (eventId) fetchEvent();
  }, [eventId]);

  // 🔥 helper image
const getImage = () => {
  const img =
    event?.event_images?.[0] ||
    event?.eventImages?.[0] ||
    event?.images?.[0];

  if (!img) return "/no-image.png";

  return `http://localhost:3000/uploads/${img.url || img.image || img.filename}`;
};
  // 🔥 checkout
  const handleCheckout = async () => {
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
      setLoading(true);

      const res = await api.post(
        `/checkout`,
        {
          eventId,
          quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const transactionId = res.data.transactionId;

      navigate(`/transactions/${transactionId}`);
    } catch (err: any) {
      console.error("CHECKOUT ERROR:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Gagal checkout");
    } finally {
      setLoading(false);
    }
  };

  if (!event) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div>
      <Header />

      <div className="min-h-screen flex">

        {/* 🔥 LEFT IMAGE */}
        <div className="w-1/2 hidden md:block bg-gray-100">
<img
  src={getImage()}
  alt="event"
  className="w-full h-full object-cover"
/>
        </div>

        {/* 🔥 RIGHT */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-10">
          <div className="w-full max-w-md">

            <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
            <p className="text-gray-500 mb-6">Checkout Ticket</p>

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
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-2 rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Checkout"}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}