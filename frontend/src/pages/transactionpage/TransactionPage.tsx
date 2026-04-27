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
        <div className="w-1/3 h-screen sticky top-0 relative overflow-hidden hidden md:block">
          <img
            src="fototransaksi.jpg"
            className="w-full h-full object-cover transform scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/80" />

          <div className="absolute inset-0 flex items-center justify-center text-white text-center px-6">
            <div>
              <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-300">
                Riwayat Transaksi
              </h2>
              <p className="text-gray-300 text-lg">
                Semua pembelian tiket kamu ada di sini
              </p>
            </div>
          </div>
        </div>

        {/* 🔥 RIGHT */}
        <div className="w-full md:w-2/3 overflow-y-auto p-6 bg-gradient-to-b from-gray-100 to-gray-200">

          <h1 className="text-3xl font-bold mb-8 text-gray-800">
            🧾 Daftar Transaksi
          </h1>

          {data.length === 0 && (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 text-center shadow-xl">
              <p className="text-gray-500 text-lg">Belum ada transaksi</p>
            </div>
          )}

          <div className="space-y-6">
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
                  className="flex gap-6 bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-white/20"
                >
                  {/* IMAGE */}
                  <img
                    src={image}
                    className="w-32 h-32 object-cover rounded-2xl shadow-md"
                  />

                  {/* CONTENT */}
                  <div className="flex-1 flex flex-col justify-between">

                    {/* TOP */}
                    <div>
                      <h2 className="text-xl font-bold text-gray-800 mb-1">
                        {trx.order?.event?.name}
                      </h2>

                      <p className="text-sm text-gray-600">
                        🎫 Qty: {trx.order?.quantity}
                      </p>

                      {/* 🔥 COUNTDOWN */}
                      {trx.status === "PENDING" && (
                        <p
                          className={`mt-2 font-semibold text-sm ${
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
                    <div className="flex justify-between items-end mt-4">
                      <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Rp {trx.totalAmount.toLocaleString()}
                      </p>

                      {/* STATUS BADGE */}
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusStyle(
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