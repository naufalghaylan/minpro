import { useEffect, useState } from "react";
import api from "../../api";
import Header from "../../components/navbar";
import { useAuthStore } from "../../store/auth";

export default function VoucherPage() {
  const token = useAuthStore((s) => s.token);

  const [events, setEvents] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);

  const [form, setForm] = useState({
    code: "",
    discountType: "PERCENT",
    discountValue: "",
    quota: "",
    startDate: "",
    endDate: "",
    eventId: "",
  });

  const [loading, setLoading] = useState(false);

  // 🔥 FETCH EVENTS
  const fetchEvents = async () => {
    const res = await api.get("/events", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setEvents(res.data);
  };

  // 🔥 FETCH VOUCHERS
  const fetchVouchers = async () => {
    const res = await api.get("/vouchers", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setVouchers(res.data);
  };

  useEffect(() => {
    fetchEvents();
    fetchVouchers();
  }, []);

  // 🔥 CREATE VOUCHER
  const handleCreate = async () => {
    try {
      setLoading(true);

      await api.post("/vouchers", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Voucher berhasil dibuat!");
      setForm({
        code: "",
        discountType: "PERCENT",
        discountValue: "",
        quota: "",
        startDate: "",
        endDate: "",
        eventId: "",
      });

      fetchVouchers();
    } catch (err: any) {
      alert(err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };
const handleDelete = async (id: string) => {
  const confirmDelete = confirm("Yakin mau hapus voucher?");
  if (!confirmDelete) return;

  try {
    await api.delete(`/vouchers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    alert("Voucher berhasil dihapus");
    fetchVouchers(); // 🔥 refresh list
  } catch (err: any) {
    alert(err.response?.data?.message);
  }
};
  return (
    <div className="bg-gray-100 min-h-screen">
      <Header />

      <div className="max-w-6xl mx-auto p-4">

        <h1 className="text-2xl font-bold mb-4">🎟️ Voucher Management</h1>

        {/* 🔥 FORM */}
        <div className="bg-white p-6 rounded-xl shadow mb-6 grid md:grid-cols-2 gap-4">

          <input
            placeholder="Kode Voucher"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="border p-2 rounded"
          />

          <select
            value={form.discountType}
            onChange={(e) =>
              setForm({ ...form, discountType: e.target.value })
            }
            className="border p-2 rounded"
          >
            <option value="PERCENT">Percent (%)</option>
            <option value="FIXED">Fixed (Rp)</option>
          </select>

          <input
            placeholder="Nilai Diskon"
            value={form.discountValue}
            onChange={(e) =>
              setForm({ ...form, discountValue: e.target.value })
            }
            className="border p-2 rounded"
          />

          <input
            placeholder="Quota"
            value={form.quota}
            onChange={(e) => setForm({ ...form, quota: e.target.value })}
            className="border p-2 rounded"
          />

          <input
            type="date"
            value={form.startDate}
            onChange={(e) =>
              setForm({ ...form, startDate: e.target.value })
            }
            className="border p-2 rounded"
          />

          <input
            type="date"
            value={form.endDate}
            onChange={(e) =>
              setForm({ ...form, endDate: e.target.value })
            }
            className="border p-2 rounded"
          />

          {/* 🔥 PILIH EVENT */}
          <select
            value={form.eventId}
            onChange={(e) =>
              setForm({ ...form, eventId: e.target.value })
            }
            className="border p-2 rounded col-span-2"
          >
            <option value="">-- Pilih Event --</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="col-span-2 bg-blue-600 text-white py-2 rounded"
          >
            {loading ? "Membuat..." : "Create Voucher"}
          </button>
        </div>

        {/* 🔥 LIST VOUCHER */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-3">Daftar Voucher</h2>

          {vouchers.length === 0 && (
            <p className="text-gray-500">Belum ada voucher</p>
          )}

          <div className="space-y-3">
{vouchers.map((v) => (
  <div
    key={v.id}
    className="border p-3 rounded flex justify-between items-center"
  >
    <div>
      <p className="font-bold">{v.code}</p>

      <p className="text-sm text-gray-500">
        {v.discountType === "PERCENT"
          ? `${v.discountValue}%`
          : `Rp ${v.discountValue}`}
      </p>

      <p className="text-xs text-gray-400">
        Quota: {v.used}/{v.quota}
      </p>
    </div>

    <div className="flex items-center gap-3">

      <div className="text-sm text-gray-500">
        {new Date(v.startDate).toLocaleDateString()} -{" "}
        {new Date(v.endDate).toLocaleDateString()}
      </div>

      {/* 🔥 DELETE BUTTON */}
<button
  onClick={() => handleDelete(v.id)}
  className="text-red-500 hover:text-red-700 text-sm"
>
  🗑️
</button>

    </div>
  </div>
))}
          </div>
        </div>

      </div>
    </div>
  );
}