import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api";
import Header from "../../components/navbar";

export default function TransactionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [expiredAt, setExpiredAt] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  const [timeLeft, setTimeLeft] = useState("");

  const BASE_URL = "http://localhost:3000";

  // ======================
  // 🔥 FETCH DATA
  // ======================
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const res = await api.get(`/transactions/${id}`);

        setOrder({
          ...res.data.order,
          totalAmount: res.data.totalAmount,
          voucherDiscountUsed: res.data.voucherDiscount,
          couponDiscountUsed: res.data.couponDiscount,
          referralDiscountUsed: res.data.referralDiscount,
          walletAmountUsed: res.data.walletUsed,
        });
        setEvent(res.data.order.event);
        setStatus(res.data.status);
        setExpiredAt(res.data.expiredAt);
      } catch (err: any) {
        if (err.response?.status === 401) {
          alert("Session habis, login lagi");
          navigate("/login");
          return;
        }
        setError("Transaksi tidak ditemukan ❌");
      } finally {
        setFetchLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // ======================
  // 🔥 COUNTDOWN
  // ======================
  useEffect(() => {
    if (!expiredAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const exp = new Date(expiredAt).getTime();
      const diff = exp - now;

      if (diff <= 0) {
        setTimeLeft("Waktu habis");
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiredAt]);

  // ======================
  // 🔥 IMAGE
  // ======================
  const image = event?.event_images?.[0]?.url
    ? `${BASE_URL}/uploads/${event.event_images[0].url}`
    : "/no-image.png";

  // ======================
  // 🔥 PRICING (AMBIL DARI BACKEND)
  // ======================
  const price = Number(order?.price ?? 0);
  const finalPrice = Number(order?.finalPrice ?? price);
  const quantity = Number(order?.quantity ?? 0);

  const subtotal = price * quantity;

  const voucherDiscount = Number(order?.voucherDiscountUsed ?? 0);
  const couponDiscount = Number(order?.couponDiscountUsed ?? 0);
  const referralDiscount = Number(order?.referralDiscountUsed ?? 0);
  const walletUsed = Number(order?.walletAmountUsed ?? 0);

  // ✅ PENTING: TOTAL LANGSUNG DARI BACKEND
  const total = Number(order?.totalAmount ?? 0);

  const isDiscount = finalPrice < price;

  console.log("DEBUG FRONTEND:", {
    price,
    finalPrice,
    quantity,
    subtotal,
    voucherDiscount,
    couponDiscount,
    referralDiscount,
    walletUsed,
    total,
  });

  // ======================
  // 🔥 STATUS
  // ======================
  let statusMessage = "";
  let disableForm = false;

  if (status === "PAID") {
    statusMessage =
      "SUDAH DI BAYAR MENUNGGU DI APPROVE OLEH EVENT ORGANIZER";
    disableForm = true;
  } else if (
    status === "EXPIRED" ||
    status === "CANCELLED" ||
    status === "REJECTED"
  ) {
    statusMessage =
      "TRANSAKSI SUDAH TIDAK BISA DIAKSES, SILAHKAN ORDER ULANG";
    disableForm = true;
  } else if (status === "DONE") {
    statusMessage = "TRANSAKSI BERHASIL 🎉";
    disableForm = true;
  }

  // ======================
  // 🔥 IMAGE HANDLER
  // ======================
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disableForm) return;

    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  // ======================
  // 🔥 SUBMIT
  // ======================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (disableForm) return;

    if (!imageFile) {
      setError("Upload bukti pembayaran dulu!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("paymentProof", imageFile);

      await api.post(`/transactions/${id}/upload`, formData);

      alert("Transaksi berhasil 🚀");
      navigate("/");
    } catch (err: any) {
      if (err.response?.status === 401) {
        alert("Session habis, login lagi");
        navigate("/login");
        return;
      }

      setError(err.response?.data?.message || "Terjadi error");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <p className="text-red-500 text-lg font-semibold">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Detail Transaksi
          </h1>

          <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-white/20">
            <div className="grid md:grid-cols-2 gap-0">

              {/* LEFT */}
              <div className="p-8 md:p-10">
                <div className="relative rounded-2xl overflow-hidden shadow-lg mb-6">
                  <img
                    src={image}
                    className="w-full h-72 object-cover transform hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-2">{event?.name}</h2>

                <div className="flex items-baseline gap-3 mb-6">
                  {event?.pricingType === "FREE" ? (
                    <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500">
                      GRATIS
                    </p>
                  ) : (
                    <>
                      {isDiscount && (
                        <p className="text-gray-400 line-through text-lg">
                          Rp {price.toLocaleString()}
                        </p>
                      )}

                      <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Rp {finalPrice.toLocaleString()}
                      </p>
                    </>
                  )}
                </div>

                {/* 🔥 BREAKDOWN */}
                <div className="bg-gray-50 rounded-2xl p-6 space-y-3 text-sm">

                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Harga x {quantity}</span>
                    <span className="font-semibold text-gray-800">Rp {subtotal.toLocaleString()}</span>
                  </div>

                  {voucherDiscount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span className="font-medium">💰 Voucher</span>
                      <span className="font-semibold">- Rp {voucherDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  {couponDiscount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span className="font-medium">🎟️ Coupon</span>
                      <span className="font-semibold">- Rp {couponDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  {referralDiscount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span className="font-medium">👥 Referral</span>
                      <span className="font-semibold">- Rp {referralDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  {walletUsed > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span className="font-medium">💳 Wallet</span>
                      <span className="font-semibold">- Rp {walletUsed.toLocaleString()}</span>
                    </div>
                  )}

                  {/* ✅ TOTAL FIX */}
                  <div className="flex justify-between items-center font-bold text-xl pt-4 mt-2 border-t-2 border-gray-300">
                    <span className="text-gray-800">Total</span>
                    {event?.pricingType === "FREE" ? (
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500">
                        GRATIS
                      </span>
                    ) : (
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Rp {total.toLocaleString()}
                      </span>
                    )}
                  </div>

                </div>

                {status === "PENDING" && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
                    <p className="font-bold text-yellow-800 text-sm">⏰ HARAP BAYAR SEBELUM :</p>
                    <p className="text-2xl font-bold text-yellow-700 mt-1">{timeLeft}</p>
                  </div>
                )}

                {statusMessage && (
                  <div className={`mt-6 p-4 rounded-xl border ${
                    status === "DONE"
                      ? "bg-green-50 border-green-200"
                      : status === "PAID"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-100 border-gray-300"
                  }`}>
                    <p className={`font-medium ${
                      status === "DONE"
                        ? "text-green-700"
                        : status === "PAID"
                        ? "text-blue-700"
                        : "text-gray-700"
                    }`}>
                      {statusMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT */}
              {!disableForm && (
                <div className="p-8 md:p-10 bg-gradient-to-b from-gray-50 to-white border-l border-gray-200">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Upload Bukti Pembayaran
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Silakan upload bukti transfer untuk melanjutkan transaksi
                      </p>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-600 text-sm font-medium">{error}</p>
                      </div>
                    )}

                    <label className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-blue-300 rounded-2xl cursor-pointer bg-blue-50 hover:bg-blue-100 transition-all duration-300 group">
                      <div className="text-center">
                        <div className="mb-4 text-4xl">📷</div>
                        <span className="text-sm text-gray-600 font-medium mb-2 block">
                          Klik untuk upload bukti pembayaran
                        </span>
                        <span className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm group-hover:from-blue-700 group-hover:to-indigo-700 transition-all duration-300">
                          Browse File
                        </span>
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>

                    {preview && (
                      <div className="relative rounded-2xl overflow-hidden shadow-lg">
                        <img
                          src={preview}
                          className="h-48 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setPreview("");
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 rounded-xl text-white font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Processing...
                        </span>
                      ) : (
                        "Submit Transaksi"
                      )}
                    </button>
                  </form>
                </div>
              )}

              {disableForm && (
                <div className="p-8 md:p-10 bg-gradient-to-b from-gray-50 to-white border-l border-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">
                      {status === "DONE" ? "✅" : status === "PAID" ? "⏳" : "🔒"}
                    </div>
                    <p className="text-gray-600 font-medium">
                      {status === "DONE"
                        ? "Transaksi selesai"
                        : status === "PAID"
                        ? "Menunggu approval"
                        : "Transaksi ditutup"}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
