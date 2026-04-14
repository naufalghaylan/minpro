import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/auth";
import Header from "../../components/navbar";

type Order = {
  id: string;
  event: {
    name: string;
  };
  quantity: number;
  totalAmount: number;
};

export default function TransactionPage() {
  const { token } = useAuthStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 GET ORDERS (bukan transactions)
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("http://localhost:3000/orders", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        setOrders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchOrders();
  }, [token]);
  const grandTotal = orders.reduce(
    (acc, item) => acc + item.totalAmount,
    0
  );
  const handleCancel = async (id: string) => {
  try {
    const res = await fetch(`http://localhost:3000/orders/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Gagal delete");
    }

    setOrders((prev) => prev.filter((item) => item.id !== id));

  } catch (err) {
    console.error(err);
  }
};

  // 🔥 CREATE TRANSACTION
const handlePayment = async () => {
  try {
    const res = await fetch("http://localhost:3000/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orders: orders.map((o) => o.id),
        totalAmount: grandTotal,
      }),
    });

    const result = await res.json();

    // 🔥 WAJIB CEK INI
    if (!res.ok) {
      console.error("ERROR BACKEND:", result);
      alert(result.message || "Gagal transaksi");
      return;
    }

    console.log("SUCCESS:", result);

    alert("Pembayaran berhasil 🚀");

    setOrders([]);

  } catch (err) {
    console.error("FETCH ERROR:", err);
    alert("Tidak bisa connect ke server");
  }
};

  if (loading) return <p>Loading...</p>;

return (
  <>
    <Header />
    <div className="flex min-h-screen bg-gray-100">

      {/* 🔥 LEFT - SUMMARY (dipindah ke kiri) */}
      <div className="w-2/3 p-6">
        <h2 className="text-xl font-bold mb-4">Ringkasan Order</h2>

        {orders.map((item) => (
          <div key={item.id} className="mb-4 border-b pb-4">
            <p className="font-bold">{item.event.name}</p>
            <p>{item.quantity} seats</p>

            <div className="flex justify-between items-center mt-2">
              <p>Rp {item.totalAmount.toLocaleString()}</p>

              <button
                onClick={() => handleCancel(item.id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                CANCEL
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 🔥 RIGHT - PAYMENT (dipindah ke kanan & jadi besar) */}
      <div className="w-1/3 bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>

        <div className="bg-white p-6 rounded-xl shadow">
          {orders.map((item) => (
            <div key={item.id} className="mb-4 border-b pb-3">
              <p className="font-semibold">{item.event.name}</p>
              <p>{item.quantity} seats</p>
              <p>Rp {item.totalAmount.toLocaleString()}</p>
            </div>
          ))}

          <div className="mt-6 text-xl font-bold">
            Total: Rp {grandTotal.toLocaleString()}
          </div>

          <button
            onClick={handlePayment}
            className="mt-6 w-full bg-green-500 text-white py-3 rounded-xl hover:bg-green-600"
          >
            Pembayaran
          </button>
        </div>
      </div>

    </div>
  </>
);
}