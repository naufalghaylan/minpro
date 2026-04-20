import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../api";
import { useAuthStore } from "../../store/auth";
import Header from "../../components/navbar";
import QRCode from "react-qr-code";

const QRCodeComponent = (QRCode as any).default || QRCode;

export default function TicketDetailPage() {
  const { id } = useParams();
  const token = useAuthStore((s) => s.token);

  const [event, setEvent] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
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

  const submitReview = async () => {
    if (!comment.trim()) return alert("Komentar tidak boleh kosong");

    try {
      await api.post(
        "/reviews",
        { eventId: id, rating, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Review berhasil dikirim!");
      setComment("");
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal mengirim review");
    }
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!event) return <div className="p-4 text-center">Event tidak ditemukan</div>;

  return (
    <>
      <Header />

      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">🎟️ Ticket Detail</h1>

        {/* EVENT INFO */}
        <div className="bg-white p-4 rounded shadow mb-4">
          <h2 className="font-bold text-lg">{event.name}</h2>
          <p className="text-gray-500">
            📍 {event.location}, {event.city}
          </p>

          <div className="mt-2 text-sm space-y-1">
            {/* 🔥 FIX DISINI */}
            <p>📅 {formatDate(event.eventDate)}</p>

            <p>
              ⏰ {event.startTime || "-"} - {event.endTime || "-"}
            </p>
          </div>
        </div>

        {/* QR SECTION */}
        <div className="bg-white p-6 rounded shadow mb-4 text-center">
          <p className="mb-4 font-semibold text-gray-700">
            QR Code Tiket
          </p>

          <div className="bg-white p-3 inline-block border border-gray-100 rounded-lg shadow-inner">
            <QRCodeComponent value={`ticket-${id}`} size={160} />
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Tunjukkan QR Code ini kepada petugas di lokasi
          </p>
        </div>

        {/* REVIEW SECTION */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-3">Beri Review</h2>

          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="border p-2 mb-3 w-full rounded"
          >
            <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
            <option value={4}>⭐⭐⭐⭐ (4/5)</option>
            <option value={3}>⭐⭐⭐ (3/5)</option>
            <option value={2}>⭐⭐ (2/5)</option>
            <option value={1}>⭐ (1/5)</option>
          </select>

          <textarea
            placeholder="Tulis pengalaman kamu..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="border p-2 w-full mb-3 rounded h-24"
          />

          <button
            onClick={submitReview}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full transition"
          >
            Kirim Review
          </button>
        </div>
      </div>
    </>
  );
}