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
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [voucherCode, setVoucherCode] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [loadingVoucher, setLoadingVoucher] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);

  const BASE_URL = "http://localhost:3000";

  // FORMAT DATE
  const formatDate = (date?: string) => {
    if (!date) return "-";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";

    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      fetchReviews();
      fetchCoupons();
    }
  }, [eventId]);

  useEffect(() => {
    if (reviews.length >= 0) {
      checkPurchaseAndReview();
    }
  }, [reviews]);

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

    // Convert current time to WIB (UTC+7)
    const utc = now + (new Date().getTimezoneOffset() * 60000);
    const wibNow = utc + (3600000 * 7);

    // Convert endDate to WIB
    const endTime = new Date(end).getTime();
    const utcEnd = endTime + (new Date(end).getTimezoneOffset() * 60000);
    const wibEnd = utcEnd + (3600000 * 7);

    const distance = wibEnd - wibNow;
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
      setAppliedCouponCode(voucherCode);
    } catch (err: any) {
      alert(err.response?.data?.message);
      setPreview(null);
      setAppliedCouponCode(null);
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

      if (event.pricingType === "FREE") {
        alert("PEMESANAN TICKET EVENT BERHASIL.... REDIRECT KE EVENT TICKET");
        navigate("/myticket");
      } else {
        navigate(`/transactions/${res.data.transactionId}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Checkout gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-gray-100 to-gray-200 min-h-screen">
      <Header />

      <div className="max-w-7xl mx-auto p-6 py-12 grid md:grid-cols-2 gap-8">

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
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">

          <h1 className="text-3xl font-bold text-gray-800 mb-3">{event.name}</h1>
          

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full">
              <span className="text-yellow-500 text-lg">⭐</span>
              <span className="font-semibold text-yellow-700">
                {avgRating.toFixed(1)} / 5
              </span>
              <span className="text-yellow-600 text-sm">({reviews.length} review)</span>
            </div>
            
            {/* Status Badge */}
            <span className={`text-xs font-bold px-4 py-1.5 rounded-full text-white shadow-md ${
              isEnded
                ? "bg-gray-500"
                : isSoldOut
                ? "bg-red-500"
                : "bg-gradient-to-r from-green-500 to-emerald-500"
            }`}>
              {isEnded && "ENDED"}
              {isSoldOut && "SOLD OUT"}
              {!isEnded && !isSoldOut && "AVAILABLE"}
            </span>
          </div>
                    {/* DATE & TIME */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-gray-700">
              <span className="text-2xl">📅</span>
              <span className="font-medium">{formatDate(event.eventDate)}</span>
            </div>

            <div className="flex items-center gap-3 text-gray-700">
              <span className="text-2xl">⏰</span>
              <span className="font-medium">{event.startTime || "-"} - {event.endTime || "-"}</span>
            </div>
          </div>

          <p className="text-gray-600 mb-6 leading-relaxed">{event.description}</p>



          {/* REVIEWS LIST */}
          <div className="mb-6">
            <h3 className="font-bold text-lg text-gray-800 mb-4">📝 Reviews</h3>
            {reviews.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {reviews.map((review: any) => (
                  <div key={review.id} className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {review.user?.name?.charAt(0).toUpperCase() || "A"}
                      </div>
                      <span className="font-semibold text-gray-800">{review.user?.name || "Anonymous"}</span>
                      <span className="text-yellow-500 text-sm">⭐ {review.rating}/5</span>
                    </div>
                    <p className="text-sm text-gray-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-500">Belum ada review</p>
              </div>
            )}
          </div>

          {/* PRICE */}
          <div className="mb-6">
            {event.pricingType === "FREE" ? (
              <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500">
                GRATIS
              </p>
            ) : (
              <>
                {isDiscount && (
                  <p className="text-gray-400 line-through text-lg mb-1">
                    Rp {price.toLocaleString()}
                  </p>
                )}

                <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  Rp {finalPrice.toLocaleString()}
                </p>
              </>
            )}
          </div>

          {/* QUANTITY */}
          {!isEnded && !isSoldOut && (
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
              <span className="font-semibold text-gray-700">Jumlah</span>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-xl font-bold text-gray-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 transition"
                >-</button>
                <span className="text-2xl font-bold text-gray-800 w-12 text-center">{quantity}</span>
                <button 
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-xl font-bold text-gray-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 transition"
                >+</button>
              </div>
            </div>
          )}

          {/* VOUCHER / COUPON */}
          {!isEnded && !isSoldOut && event.pricingType !== "FREE" && (
            <div className="mb-6">
              <div className="flex border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-500 transition">

                <input
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Kode voucher / coupon"
                  className="flex-1 px-5 py-3 outline-none text-gray-700 placeholder-gray-400"
                />

                <button
                  onClick={applyVoucher}
                  disabled={!voucherCode || loadingVoucher}
                  className={`px-6 font-semibold transition ${
                    !voucherCode
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  }`}
                >
                  {loadingVoucher ? "..." : "Apply"}
                </button>
              </div>

              {preview && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-green-700 text-sm font-medium">✔ Voucher/Coupon berhasil digunakan</p>
                </div>
              )}

              {/* Available Coupons */}
              {coupons.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-bold text-slate-700 mb-3">🎟️ Kupon tersedia:</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {coupons.map((coupon) => {
                      const expired = isExpired(coupon.expiresAt);
                      const used = isUsed(coupon.usedAt);
                      const isApplied = appliedCouponCode === coupon.code;

                      if (expired || used) return null;

                      return (
                        <div
                          key={coupon.id}
                          onClick={() => !isApplied && handleCouponClick(coupon.code)}
                          className={`flex items-center justify-between p-3 rounded-xl transition ${
                            isApplied
                              ? "bg-green-50 border-green-300 border-2"
                              : "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 cursor-pointer hover:from-blue-100 hover:to-indigo-100"
                          }`}
                        >
                          <div>
                            <p className={`text-sm font-bold ${isApplied ? "text-green-800" : "text-blue-800"}`}>{coupon.code}</p>
                            <p className="text-xs text-slate-600">potongan sebesar {coupon.amount.toLocaleString()}%</p>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            isApplied
                              ? "bg-green-600 text-white"
                              : "bg-white text-blue-600"
                          }`}>
                            {isApplied ? "Applied ✓" : "Klik untuk pakai"}
                          </span>
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
          {!isEnded && !isSoldOut && event.pricingType !== "FREE" && (
            <div className="border-t-2 border-gray-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  Rp {total.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading || isEnded || isSoldOut}
            className={`w-full mt-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] ${
              isEnded || isSoldOut
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl"
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

          {/* REVIEW SECTION - Always show */}
          <div className="mt-8 border-t-2 border-gray-200 pt-8">
            <h3 className="font-bold text-xl text-gray-800 mb-6"> Beri Review</h3>

            {!token ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                <p className="text-blue-700 font-semibold"> Login dulu untuk memberikan review</p>
              </div>
            ) : !hasPurchased ? (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6">
                <p className="text-orange-700 font-semibold"> Beli event dulu untuk memberikan review</p>
              </div>
            ) : hasReviewed ? (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                <p className="text-green-700 font-semibold"> Kamu sudah memberikan review untuk event ini</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Rating</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full md:w-auto border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                    <option value={4}>⭐⭐⭐⭐ (4/5)</option>
                    <option value={3}>⭐⭐⭐ (3/5)</option>
                    <option value={2}>⭐⭐ (2/5)</option>
                    <option value={1}>⭐ (1/5)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Komentar</label>
                  <textarea
                    placeholder="Tulis pengalaman kamu..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full border-2 border-gray-300 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none resize-none h-28"
                  />
                </div>

                <button
                  onClick={submitReview}
                  disabled={reviewLoading}
                  className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 shadow-lg hover:shadow-xl"
                >
                  {reviewLoading ? "Mengirim..." : "Kirim Review"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}