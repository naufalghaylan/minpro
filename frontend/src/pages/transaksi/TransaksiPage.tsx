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
    return <p className="text-center mt-10">Loading...</p>;
  }

  if (error && !event) {
    return <p className="text-center mt-10 text-red-500">{error}</p>;
  }

  return (
    <>
      <Header />

      <div className="max-w-4xl mx-auto mt-10 p-6 bg-white shadow-xl rounded-2xl">
        <div className="grid md:grid-cols-2 gap-6">

          {/* LEFT */}
          <div>
            <img
              src={image}
              className="w-full h-64 object-cover rounded-xl shadow"
            />

            <h2 className="text-xl font-bold mt-3">{event?.name}</h2>

            {isDiscount && (
              <p className="text-gray-400 line-through text-sm">
                Rp {price.toLocaleString()}
              </p>
            )}

            <p className="text-xl font-bold text-blue-600">
              Rp {finalPrice.toLocaleString()}
            </p>

            {/* 🔥 BREAKDOWN */}
            <div className="mt-4 text-sm space-y-2 border-t pt-3">

              <div className="flex justify-between">
                <span>Harga x {quantity}</span>
                <span>Rp {subtotal.toLocaleString()}</span>
              </div>

              {voucherDiscount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Voucher</span>
                  <span>- Rp {voucherDiscount.toLocaleString()}</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Coupon</span>
                  <span>- Rp {couponDiscount.toLocaleString()}</span>
                </div>
              )}

              {referralDiscount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Referral</span>
                  <span>- Rp {referralDiscount.toLocaleString()}</span>
                </div>
              )}

              {walletUsed > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Wallet</span>
                  <span>- Rp {walletUsed.toLocaleString()}</span>
                </div>
              )}

              {/* ✅ TOTAL FIX */}
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Total</span>
                <span className="text-blue-600">
                  Rp {total.toLocaleString()}
                </span>
              </div>

            </div>

            {status === "PENDING" && (
              <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded">
                <p className="font-bold">HARAP BAYAR SEBELUM :</p>
                <p>{timeLeft}</p>
              </div>
            )}

            {statusMessage && (
              <div className="mt-4 p-3 bg-gray-200 rounded">
                {statusMessage}
              </div>
            )}
          </div>

          {/* RIGHT */}
          {!disableForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-xl font-bold">
                Upload Bukti Pembayaran
              </h2>

              {error && <p className="text-red-500">{error}</p>}

              <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                <span className="mb-3 text-sm text-gray-500">
                  Klik untuk upload bukti pembayaran
                </span>

                <span className="px-4 py-2 bg-black text-white rounded-md">
                  Browse File
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {preview && (
                <img
                  src={preview}
                  className="h-40 w-full object-cover rounded-lg"
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Submit Transaksi"}
              </button>
            </form>
          )}

        </div>
      </div>
    </>
  );
}