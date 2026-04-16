import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function TransactionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  const BASE_URL = "http://localhost:3000";

  // 🔥 ambil data event
  useEffect(() => {
    if (!id) return;

    const fetchEvent = async () => {
      try {
        console.log("Fetch ID:", id);

        const res = await axios.get(`${BASE_URL}/events/${id}`);
        setEvent(res.data);
      } catch (err) {
        console.log(err);
        setError("Event tidak ditemukan ❌");
      } finally {
        setFetchLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  // 🔥 handle upload
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  // 🔥 submit transaksi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!image) {
      setError("Upload bukti pembayaran dulu!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("paymentProof", image);

      await axios.post(`${BASE_URL}/transactions/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Transaksi berhasil 🚀");
      navigate("/");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Terjadi error");
      } else {
        setError("Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔥 HANDLE UI LOADING & ERROR
  if (fetchLoading) {
    return <p className="text-center mt-10">Loading...</p>;
  }

  if (error && !event) {
    return <p className="text-center mt-10 text-red-500">{error}</p>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 shadow-lg rounded-xl">
      <div className="grid md:grid-cols-2 gap-6">

        {/* 🔥 LEFT: EVENT IMAGE */}
        <div>
          <img
            src={event?.images?.[0]}
            alt="event"
            className="w-full h-64 object-cover rounded-xl shadow"
          />

          <h2 className="text-xl font-bold mt-3">{event?.name}</h2>
          <p className="text-gray-500">Rp {event?.price}</p>
        </div>

        {/* 🔥 RIGHT: FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-bold">Upload Bukti Pembayaran</h2>

          {error && (
            <p className="text-red-500">{error}</p>
          )}

          {/* 🔥 Upload UI */}
          <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
            
            <span className="mb-3 text-sm text-gray-500">
              Klik untuk upload bukti pembayaran
            </span>

            <span className="px-4 py-2 bg-black text-white rounded-md shadow hover:bg-gray-800 transition">
              Browse File
            </span>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>

          {/* 🔥 Preview + tombol X */}
          {preview && (
            <div className="relative mt-4">
              <img
                src={preview}
                alt="preview"
                className="h-40 w-full object-cover rounded-lg shadow"
              />

              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setPreview("");
                }}
                className="absolute top-2 right-2 bg-black text-white px-2 py-1 rounded-full"
              >
                ✕
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            {loading ? "Loading..." : "Submit Transaksi"}
          </button>
        </form>
      </div>
    </div>
  );
}