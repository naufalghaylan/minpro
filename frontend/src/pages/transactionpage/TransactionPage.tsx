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
    };
  };
}

export default function TransactionPage() {
  const [data, setData] = useState<Transaction[]>([]);
  const navigate = useNavigate();

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

  return (
    <>
    <Header/>
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Daftar Transaksi</h1>

      {data.length === 0 && (
        <p className="text-gray-500">Belum ada transaksi</p>
      )}

      {data.map((trx) => (
        <div
          key={trx.id}
          className="border p-4 rounded mb-4 cursor-pointer hover:bg-gray-100"
          onClick={() => navigate(`/transactions/${trx.id}`)}
        >
          <p><b>Event:</b> {trx.order?.event?.name}</p>
          <p><b>Qty:</b> {trx.order?.quantity}</p>
          <p><b>Total:</b> Rp {trx.totalAmount}</p>

          <p
            className={`font-bold ${
              trx.status === "PENDING"
                ? "text-yellow-500"
                : trx.status === "PAID"
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            Status: {trx.status}
          </p>
        </div>
      ))}
    </div>
    </>
  );
}