import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../api";
import Header from "../../components/navbar";
import QRCode from "react-qr-code";

const QRCodeComponent = (QRCode as any).default || QRCode;

export default function TicketDetailPage() {
  const { id } = useParams();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/events/${id}`);
      setEvent(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchEvent();
  }, [id]);

  // 🔥 FORMAT DATE AMAN
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <p className="text-gray-600 text-lg font-semibold">Event tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 py-12 px-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            🎟️ Ticket Detail
          </h1>

          {/* EVENT INFO */}
          <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-white/20 mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <h2 className="text-2xl font-bold text-white">{event.name}</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-2xl">📍</span>
                <span className="font-medium">{event.location}, {event.city}</span>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-2xl">📅</span>
                <span className="font-medium">{formatDate(event.eventDate)}</span>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-2xl">⏰</span>
                <span className="font-medium">{event.startTime || "-"} - {event.endTime || "-"}</span>
              </div>
            </div>
          </div>

          {/* QR SECTION */}
          <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-white/20 p-8 text-center">
            <div className="mb-6">
              <p className="text-xl font-bold text-gray-800 mb-2">QR Code Tiket</p>
              <p className="text-gray-600 text-sm">
                Tunjukkan QR Code ini kepada petugas di lokasi
              </p>
            </div>

            <div className="bg-white p-6 inline-block border-2 border-blue-200 rounded-2xl shadow-xl">
              <QRCodeComponent value={`ticket-${id}`} size={180} />
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-blue-800 text-sm font-medium">
                💡 Simpan tiket ini untuk keperluan check-in di lokasi event
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}