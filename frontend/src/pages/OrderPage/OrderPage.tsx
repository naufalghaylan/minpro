import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/navbar";
import api from "../../api";
import { useAuthStore } from "../../store/auth";
import { getWalletAndCoupons, type Coupon } from "../../api/auth";

export default function OrderPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const [event, setEvent] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  // REVIEW
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hasPurchased, setHasPurchased] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // VOUCHER / COUPON
  const [voucherCode, setVoucherCode] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [loadingVoucher, setLoadingVoucher] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const BASE_URL = "http://localhost:3000";

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      fetchReviews();
      fetchCoupons();
      checkPurchaseAndReview();
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

  const fetchCoupons = async () => {
    try {
      const data = await getWalletAndCoupons();
      setCoupons(data.coupons);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
      setCoupons([]);
    }
  };

  const checkPurchaseAndReview = async () => {
    if (!token) return;

    try {
      // Check if user has purchased this event
      const trxRes = await api.get("/transactions");
      const userTransactions = trxRes.data;
      const hasPurchasedEvent = userTransactions.some(
        (trx: any) => trx.order?.eventId === eventId && trx.status === "DONE"
      );
      setHasPurchased(hasPurchasedEvent);

      // Check if user has already reviewed this event
      const userId = useAuthStore.getState().user?.id;
      const hasReviewedEvent = reviews.some(
        (review: any) => review.userId === userId
      );
      setHasReviewed(hasReviewedEvent);
    } catch (err) {
      console.error("Error checking purchase/review:", err);
    }
  };

  const submitReview = async () => {
    if (!comment.trim()) return alert("Komentar tidak boleh kosong");
    if (!token) return alert("Login dulu!");

    try {
      setReviewLoading(true);
      await api.post(
        "/reviews",
        { eventId, rating, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Review berhasil dikirim!");
      setComment("");
      setHasReviewed(true);
      fetchReviews();
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal mengirim review");
    } finally {
      setReviewLoading(false);
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

  const isExpired = (expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
  };

  const isUsed = (usedAt: string | null): boolean => {
    return usedAt !== null;
  };

  const handleCouponClick = (couponCode: string) => {
    setVoucherCode(couponCode);
    applyVoucher();
  };

  if (!event) return <p className="text-center mt-10">Loading...</p>;

  const price = Number(event.price);
  const baseFinalPrice = Math.max(0, calculateFinalPrice());
  const isDiscount = baseFinalPrice < price;
  let finalPrice = preview?.finalPrice ?? baseFinalPrice;
  if (finalPrice < 0) finalPrice = 0;
  const total = preview?.totalAmount ?? finalPrice * quantity;

  const countdown = getCountdown(event.discountEnd);

  const avgRating =
    reviews.reduce((acc, r) => acc + r.rating, 0) /
    (reviews.length || 1);

  const isEnded = event.status === "ENDED";
  const isSoldOut = event.availableSeats === 0;

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

          <div className="flex items-center gap-2 mt-1">
            <p className="text-yellow-500 text-sm">
              ⭐ {avgRating.toFixed(1)} / 5 ({reviews.length} review)
            </p>

            {/* Status Badge */}
            <span className={`text-xs px-3 py-1 rounded-full text-white ${
              isEnded
                ? "bg-gray-500"
                : isSoldOut
                ? "bg-red-500"
                : "bg-green-500"
            }`}>
              {isEnded && "ENDED"}
              {isSoldOut && "SOLD OUT"}
              {!isEnded && !isSoldOut && "AVAILABLE"}
            </span>
          </div>

          <p className="text-gray-500 mb-2">{event.description}</p>

          {/* REVIEWS LIST */}
          <div className="mt-4 mb-4">
            <h3 className="font-semibold mb-3">Reviews</h3>
            {reviews.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {reviews.map((review: any) => (
                  <div key={review.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{review.user?.name || "Anonymous"}</span>
                      <span className="text-yellow-500 text-sm">⭐ {review.rating}/5</span>
                    </div>
                    <p className="text-sm text-gray-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Belum ada review</p>
            )}
          </div>

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
          {!isEnded && !isSoldOut && (
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">Jumlah</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)}>+</button>
              </div>
            </div>
          )}

          {/* VOUCHER / COUPON */}
          {!isEnded && !isSoldOut && (
            <div className="mb-4">
              <div className="flex border rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-400 transition">

                <input
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Kode voucher / coupon"
                  className="flex-1 px-4 py-2 outline-none"
                />

                <button
                  onClick={applyVoucher}
                  disabled={!voucherCode || loadingVoucher}
                  className={`px-5 font-semibold transition
                    ${!voucherCode
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"}
                  `}
                >
                  {loadingVoucher ? "..." : "Apply"}
                </button>
              </div>

              {preview && (
                <p className="text-green-600 text-sm mt-1">
                  ✔ Voucher/Coupon berhasil digunakan
                </p>
              )}

              {/* Available Coupons */}
              {coupons.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Kupon tersedia:</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {coupons.map((coupon) => {
                      const expired = isExpired(coupon.expiresAt);
                      const used = isUsed(coupon.usedAt);

                      if (expired || used) return null;

                      return (
                        <div
                          key={coupon.id}
                          onClick={() => handleCouponClick(coupon.code)}
                          className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition"
                        >
                          <div>
                            <p className="text-sm font-semibold text-blue-800">{coupon.code}</p>
                            <p className="text-xs text-slate-600">potongan sebesar {coupon.amount.toLocaleString()}%</p>
                          </div>
                          <span className="text-xs text-blue-600 font-medium">Klik untuk pakai</span>
                        </div>
                      );
                    })}
                    {coupons.every(c => isExpired(c.expiresAt) || isUsed(c.usedAt)) && (
                      <p className="text-xs text-slate-500">Tidak ada kupon yang tersedia</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUMMARY */}
          {!isEnded && !isSoldOut && (
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total</span>
                <span>Rp {total.toLocaleString()}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading || isEnded || isSoldOut}
            className={`w-full mt-6 py-3 rounded-xl text-white font-semibold transition ${
              isEnded || isSoldOut
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isEnded
              ? "Event Selesai"
              : isSoldOut
              ? "Sold Out"
              : loading
              ? "Processing..."
              : "Checkout"}
          </button>

          {/* REVIEW SECTION - Only show if user has purchased */}
          {hasPurchased && (
            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">Beri Review</h3>
              
              {hasReviewed ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700">✓ Kamu sudah memberikan review untuk event ini</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="w-full md:w-auto border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                      <option value={4}>⭐⭐⭐⭐ (4/5)</option>
                      <option value={3}>⭐⭐⭐ (3/5)</option>
                      <option value={2}>⭐⭐ (2/5)</option>
                      <option value={1}>⭐ (1/5)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Komentar</label>
                    <textarea
                      placeholder="Tulis pengalaman kamu..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none resize-none h-24"
                    />
                  </div>

                  <button
                    onClick={submitReview}
                    disabled={reviewLoading}
                    className="w-full md:w-auto px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                  >
                    {reviewLoading ? "Mengirim..." : "Kirim Review"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}