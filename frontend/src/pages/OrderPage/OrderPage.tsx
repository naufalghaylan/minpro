import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/navbar";
import api from "../../api";
import { useAuthStore } from "../../store/auth";

export default function OrderPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const [event, setEvent] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  // 🔥 REVIEW
  const [reviews, setReviews] = useState<any[]>([]);

  // 🔥 VOUCHER
  const [voucherCode, setVoucherCode] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [loadingVoucher, setLoadingVoucher] = useState(false);

  // 🔥 REFERRAL
  const [useReferral, setUseReferral] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  const BASE_URL = "http://localhost:3000";

  // 🔥 AUTO RESET REFERRAL
  useEffect(() => {
    if (!useReferral) {
      setReferralCode("");
    }
  }, [useReferral]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      fetchReviews();
    }
  }, [eventId]);

const fetchEvent = async () => {
  const res = await api.get(`/events/${eventId}`);
  setEvent(res.data);
};

const fetchReviews = async () => {
  try {
    const res = await api.get(`/events/${eventId}/reviews`);
    setReviews(res.data);
  } catch (err) {
    console.error("Review error:", err);
  }
};




  const getImage = () => {
    const img =
      event?.event_images?.[0] ||
      event?.eventImages?.[0] ||
      event?.images?.[0];

    if (!img) return "/no-image.png";

    return `${BASE_URL}/uploads/${img.url || img.image || img.filename}`;
  };

  const getCountdown = (end?: string | null) => {
    if (!end) return null;

    const distance = new Date(end).getTime() - now;
    if (distance <= 0) return "Promo berakhir";

    const h = Math.floor(distance / (1000 * 60 * 60));
    const m = Math.floor((distance / (1000 * 60)) % 60);
    const s = Math.floor((distance / 1000) % 60);

    return `${h}j ${m}m ${s}d`;
  };

  const calculateFinalPrice = () => {
    const nowTime = new Date().getTime();

    if (
      event.discountType &&
      event.discountValue &&
      event.discountStart &&
      event.discountEnd
    ) {
      const start = new Date(event.discountStart).getTime();
      const end = new Date(event.discountEnd).getTime();

      if (nowTime >= start && nowTime <= end) {
        if (event.discountType === "PERCENT") {
          return event.price - (event.price * event.discountValue) / 100;
        }
        if (event.discountType === "FIXED") {
          return event.price - event.discountValue;
        }
      }
    }

    return event.price;
  };

  const applyVoucher = async () => {
    if (!token) {
      alert("Login dulu!");
      return;
    }

    try {
      setLoadingVoucher(true);

      const res = await api.post(
        "/preview",
        { eventId, quantity, voucherCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPreview(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message);
      setPreview(null);
    } finally {
      setLoadingVoucher(false);
    }
  };

  if (!event) return <p className="text-center mt-10">Loading...</p>;

  const price = Number(event.price);
  const baseFinalPrice = Math.max(0, calculateFinalPrice());
  const isDiscount = baseFinalPrice < price;

  const finalPrice = preview?.finalPrice ?? baseFinalPrice;
  const total = preview?.totalAmount ?? finalPrice * quantity;

  const countdown = getCountdown(event.discountEnd);

  const avgRating =
    reviews.reduce((acc, r) => acc + r.rating, 0) /
    (reviews.length || 1);

const handleCheckout = async () => {
  if (!token) {
    alert("Harap login dulu!");
    navigate("/login");
    return;
  }

  try {
    setLoading(true);

    const res = await api.post(
      "/checkout",
      {
        eventId,
        quantity,
        voucherCode,
        referralCode: useAuthStore.getState().user?.referredBy || null, // 🔥 otomatis
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    navigate(`/transactions/${res.data.transactionId}`);
  } catch (err: any) {
    alert(err.response?.data?.message || "Checkout gagal");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="bg-gray-100 min-h-screen">
      <Header />

      <div className="max-w-6xl mx-auto p-4 grid md:grid-cols-2 gap-6">

        {/* IMAGE */}
        <div className="relative rounded-2xl overflow-hidden shadow">
          <img
            src={getImage()}
            className="w-full h-[300px] md:h-full object-cover"
          />

          {isDiscount && (
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
              🔥 Diskon
            </div>
          )}

          {isDiscount && countdown && (
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
              ⏰ {countdown}
            </div>
          )}
        </div>

        {/* CARD */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">

          <h1 className="text-2xl font-bold">{event.name}</h1>

          <p className="text-yellow-500 text-sm mt-1">
            ⭐ {avgRating.toFixed(1)} / 5 ({reviews.length} review)
          </p>

          <p className="text-gray-500 mb-2">{event.description}</p>

          {/* PRICE */}
          <div className="mb-4">
            {isDiscount && (
              <p className="line-through text-gray-400">
                Rp {price.toLocaleString()}
              </p>
            )}

            <p className="text-3xl font-bold text-blue-600">
              Rp {finalPrice.toLocaleString()}
            </p>
          </div>

          {/* QUANTITY */}
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Jumlah</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)}>+</button>
            </div>
          </div>

          {/* VOUCHER */}
          <div className="mb-4">
            <div className="flex border rounded-lg overflow-hidden">
              <input
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Masukkan kode voucher"
                className="flex-1 px-3 py-2"
              />
              <button onClick={applyVoucher}>
                Apply
              </button>
            </div>
          </div>

          {/* 🔥 REFERRAL */}
          

          {/* SUMMARY */}
          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total</span>
              <span>Rp {total.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full mt-6 py-3 bg-blue-600 text-white rounded-xl"
          >
            {loading ? "Processing..." : "Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}