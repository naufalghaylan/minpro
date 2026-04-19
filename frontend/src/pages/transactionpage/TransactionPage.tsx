import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import Header from "../../components/navbar";

interface Transaction {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  expiredAt: string;
  order: {
    quantity: number;
    event: {
      name: string;
      event_images?: { url: string }[];
    };
  };
}

export default function TransactionPage() {
  const [data, setData] = useState<Transaction[]>([]);
  const navigate = useNavigate();

  const BASE_URL = "http://localhost:3000";

  // 🔥 fetch data
  const fetchData = async () => {
    try {
      const res = await api.get("/transactions");
      setData(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        alert("Session habis, login lagi");
        navigate("/login");
        return;
      }
      alert("Gagal ambil transaksi");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🔥 trigger rerender tiap detik (buat countdown)
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 countdown function
  const getCountdown = (expiredAt: string) => {
    const now = new Date().getTime();
    const exp = new Date(expiredAt).getTime();
    const diff = exp - now;

    if (diff <= 0) return "Waktu habis";

    const minutes = Math.floor(diff / 1000 / 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return `${minutes}m ${seconds}s`;
  };

  // 🔥 badge color
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-600";
      case "PAID":
        return "bg-blue-100 text-blue-600";
      case "DONE":
        return "bg-green-100 text-green-600";
      default:
        return "bg-red-100 text-red-500";
    }
  };

  return (
    <>
      <Header />

      <div className="flex h-[calc(100vh-80px)]">

        {/* 🔥 LEFT (STATIC IMAGE) */}
        <div className="w-1/3 h-screen sticky top-0 relative overflow-hidden">
          <img
            src="fototransaksi.jpg"
            className="w-full h-full object-cover scale-110"
          />

          <div className="absolute inset-0 bg-black/60" />

          <div className="absolute inset-0 flex items-center justify-center text-white text-center px-6">
            <div>
              <h2 className="text-3xl font-bold">
                Riwayat Transaksi
              </h2>
              <p className="text-gray-300 mt-2">
                Semua pembelian tiket kamu ada di sini
              </p>
            </div>
          </div>
        </div>

        {/* 🔥 RIGHT */}
        <div className="w-2/3 overflow-y-auto p-6 bg-gray-50">

          <h1 className="text-2xl font-bold mb-6">
            🧾 Daftar Transaksi
          </h1>

          {data.length === 0 && (
            <p className="text-gray-500">Belum ada transaksi</p>
          )}

          <div className="space-y-4">
            {data.map((trx) => {
              const image = trx.order?.event?.event_images?.[0]?.url
                ? `${BASE_URL}/uploads/${trx.order.event.event_images[0].url}`
                : "/no-image.png";

              const isDanger =
                new Date(trx.expiredAt).getTime() - Date.now() < 60000;

              return (
                <div
                  key={trx.id}
                  onClick={() => navigate(`/transactions/${trx.id}`)}
                  className="flex gap-4 bg-white p-4 rounded-2xl shadow hover:shadow-xl transition cursor-pointer"
                >
                  {/* IMAGE */}
                  <img
                    src={image}
                    className="w-28 h-28 object-cover rounded-xl"
                  />

                  {/* CONTENT */}
                  <div className="flex-1 flex flex-col justify-between">

                    {/* TOP */}
                    <div>
                      <h2 className="text-lg font-semibold">
                        {trx.order?.event?.name}
                      </h2>

                      <p className="text-sm text-gray-500">
                        Qty: {trx.order?.quantity}
                      </p>

                      {/* 🔥 COUNTDOWN */}
                      {trx.status === "PENDING" && (
                        <p
                          className={`mt-1 font-semibold ${
                            isDanger
                              ? "text-red-500 animate-pulse"
                              : "text-orange-500"
                          }`}
                        >
                          ⏳ {getCountdown(trx.expiredAt)}
                        </p>
                      )}
                    </div>

                    {/* BOTTOM */}
                    <div className="flex justify-between items-end mt-3">
                      <p className="text-blue-600 font-bold text-lg">
                        Rp {trx.totalAmount.toLocaleString()}
                      </p>

                      {/* STATUS BADGE */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(
                          trx.status
                        )}`}
                      >
                        {trx.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </>
  );
}