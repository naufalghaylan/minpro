import { useEffect, useState } from "react";
import api from "../../api";
import { useAuthStore } from "../../store/auth";
import { useNavigate } from "react-router-dom";
import Header from "../../components/navbar";

export default function MyTicketsPage() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);

  const fetchTickets = async () => {
    try {
      const res = await api.get("/my-tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchTickets();
  }, [token]);

  return (
    <>
    <Header />
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">🎟️ My Tickets</h1>

      {data.length === 0 && (
        <p className="text-gray-500">Belum ada tiket</p>
      )}

      {data.map((trx) => {
        const order = trx.order;

        if (!order) return null;

        return (
          <div
            key={order.id}
            onClick={() => navigate(`/ticketdetail/${order.event?.id}`)}
            className="border p-3 rounded mb-3 cursor-pointer"
          >
            <p className="font-bold">{order.event?.name}</p>
            <p className="text-sm text-gray-500">
              {order.event?.location}
            </p>
          </div>
        );
      })}
    </div></>
  );
}