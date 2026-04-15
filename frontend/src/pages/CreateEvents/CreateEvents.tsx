import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth"; // 🔥 pakai zustand
import api from "../../api";
import axios from "axios";

interface EventForm {
  name: string;
  price: string;
  totalSeats: string;
  images: string[];
}

export default function CreateEvent() {
  const user = useAuthStore((s) => s.user); // 🔥 ambil dari zustand
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [form, setForm] = useState<EventForm>({
    name: "",
    price: "",
    totalSeats: "",
    images: [""],
  });

  // 🔥 PROTEKSI HALAMAN (tanpa isLoading)
  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (user.role !== "EVENT_ORGANIZER") {
      navigate("/");
    }
  }, [user, navigate]);

  // 🔥 input handler
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...form.images];
    newImages[index] = value;
    setForm({ ...form, images: newImages });
  };

  const addImageField = () => {
    setForm({ ...form, images: [...form.images, ""] });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await api.post("/events", form);

      alert("Event berhasil dibuat 🚀");
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

  // 🔥 OPTIONAL biar ga flicker
  if (!user) {
    return <p className="text-center mt-10">Loading...</p>;
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 shadow-lg rounded-xl">
      <h1 className="text-2xl font-bold mb-5">Create Event</h1>

      {error && <p className="text-red-500 mb-3">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Nama Event"
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="number"
          name="price"
          placeholder="Harga"
          min="0"
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="number"
          name="totalSeats"
          placeholder="Total Seats"
          min="0"
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        {/* Images */}
        <div>
          <p className="font-semibold">Images URL</p>

          {form.images.map((img, index) => (
            <div key={index} className="mt-2">
              <input
                type="text"
                placeholder="Image URL"
                value={img}
                onChange={(e) =>
                  handleImageChange(index, e.target.value)
                }
                className="w-full border p-2 rounded"
              />

              {img && (
                <img
                  src={img}
                  alt="preview"
                  className="mt-2 h-32 object-cover rounded"
                />
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addImageField}
            className="text-blue-500 mt-2"
          >
            + Tambah Gambar
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          {loading ? "Loading..." : "Create Event"}
        </button>
      </form>
    </div>
  );
}