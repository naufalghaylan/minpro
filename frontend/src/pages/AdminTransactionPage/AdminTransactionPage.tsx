import { useEffect, useState } from "react";
import {
  getTransactions,
  approveTransaction,
  rejectTransaction,
} from "../../api/transactions";
import { useAuthStore } from "../../store/auth";
import Header from "../../components/navbar";

interface Transaction {
  id: string;
  totalAmount: number;
  status: string;
  paymentProof?: string;
  createdAt: string;
}

export default function AdminTransactionPage() {
  const [data, setData] = useState<Transaction[]>([]);
  const { user } = useAuthStore();

  const fetchData = async () => {
    try {
      const res = await getTransactions();
      setData(res);
    } catch (err) {
      alert("Gagal ambil transaksi");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🔥 PROTECT EO ONLY
  if (user?.role !== "EVENT_ORGANIZER") {
    return <div className="p-5 text-red-500">Akses ditolak</div>;
  }

  const handleApprove = async (id: string) => {
    try {
      await approveTransaction(id);
      alert("Berhasil di-approve");
      fetchData();
    } catch (err) {
      alert("Gagal approve");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectTransaction(id);
      alert("Berhasil di-reject");
      fetchData();
    } catch (err) {
      alert("Gagal reject");
    }
  };

  return (
    <>
    <Header/>
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Verifikasi Transaksi</h1>

      <div className="grid gap-4">
        {data.map((trx) => (
          <div
            key={trx.id}
            className="border p-4 rounded-xl shadow flex flex-col gap-2"
          >
            <p><b>ID:</b> {trx.id}</p>
            <p><b>Total:</b> Rp {trx.totalAmount}</p>
            <p><b>Status:</b> {trx.status}</p>

            {/* 🔥 BUKTI BAYAR */}
            {trx.paymentProof && (
              <img
               src={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/uploads/${trx.paymentProof}`}
                alt="proof"
                className="w-40 rounded"
              />
            )}

            {/* 🔥 ACTION */}
            {trx.status === "PAID" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(trx.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  Approve
                </button>

                <button
                  onClick={() => handleReject(trx.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div></>
  );
}