import { useEffect, useState } from "react";
import api from "../../api";
import { useAuthStore } from "../../store/auth";
import { useNavigate } from "react-router-dom";
import Header from "../../components/navbar";

const BASE_URL = "http://localhost:3000";

export default function MyTicketsPage() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/my-tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTickets();
  }, [token]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";

    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <>
      <Header />
      <div className="bg-gradient-to-b from-gray-100 to-gray-200 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 py-12">
          <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            🎟️ My Tickets
          </h1>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!loading && data.length === 0 && (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 text-center shadow-xl">
              <p className="text-gray-500 text-lg">Belum ada tiket</p>
            </div>
          )}

          {!loading && data.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.map((trx) => {
                const order = trx.order;
                const event = order?.event;

                if (!order || !event) return null;

                const getImage = () => {
                  const img =
                    event?.event_images?.[0] ||
                    event?.eventImages?.[0] ||
                    event?.images?.[0];

                  if (!img) return "/no-image.png";

                  return `${BASE_URL}/uploads/${img.url || img.image || img.filename}`;
                };

                const image = getImage();

                return (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/ticketdetail/${event.id}`)}
                    className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-white/20 cursor-pointer"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={image}
                        alt={event.name}
                        className="h-full w-full object-cover transform hover:scale-110 transition-transform duration-500"
                      />
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                        {event.name}
                      </h3>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>{formatDate(event.eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>⏰</span>
                          <span>{event.startTime || "-"} - {event.endTime || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span className="truncate">{event.city || event.location || "Unknown Location"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🎫</span>
                          <span>Quantity: {order.quantity}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-600">
                          {trx.status}
                        </span>
                        <span className="text-sm font-semibold text-blue-600">
                          Lihat Detail →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}