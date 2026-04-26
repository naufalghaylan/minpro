import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import api from "../../api";
import axios from "axios";
import Header from "../../components/navbar";

interface EventForm {
  name: string;
  description: string;

  price: string;
  totalSeats: string;

  eventDate: string;
  startTime: string;
  endTime: string;

  location: string;
  city: string;

  // DISKON
  discountType: string;
  discountValue: string;
  discountStart: string;
  discountEnd: string;
}

export default function CreateEvent() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<EventForm>({
    name: "",
    description: "",

    price: "",
    totalSeats: "",

    eventDate: "",
    startTime: "",
    endTime: "",

    location: "",
    city: "",

    discountType: "",
    discountValue: "",
    discountStart: "",
    discountEnd: "",
  });

  const [images, setImages] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);

  useEffect(() => {
    if (user === null) return;

    if (!user) navigate("/login");
    else if (user.role !== "EVENT_ORGANIZER") navigate("/");
  }, [user, navigate]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (
      (name === "price" || name === "totalSeats" || name === "discountValue") &&
      Number(value) < 0
    ) return;

    setForm({ ...form, [name]: value });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setImages(fileArray);

    const previewUrls = fileArray.map((file) =>
      URL.createObjectURL(file)
    );
    setPreview(previewUrls);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      images.forEach((file) => {
        formData.append("images", file);
      });

      await api.post("/events", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

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

  if (user === null) {
    return <p className="text-center mt-10">Loading...</p>;
  }

  return (
    <>
      <Header />

      <div className="max-w-xl mx-auto mt-10 p-6 shadow-lg rounded-xl bg-white">
        <h1 className="text-2xl font-bold mb-5">Create Event</h1>

        {error && <p className="text-red-500 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* BASIC */}
          <input name="name" placeholder="Nama Event" onChange={handleChange} className="w-full border p-2 rounded" required />

          <textarea name="description" placeholder="Deskripsi Event" onChange={handleChange} className="w-full border p-2 rounded" />

          <input type="number" name="price" placeholder="Harga" onChange={handleChange} className="w-full border p-2 rounded" required />

          <input type="number" name="totalSeats" placeholder="Total Seats" onChange={handleChange} className="w-full border p-2 rounded" required />

          {/* EVENT DETAIL */}
          <div className="border p-4 rounded bg-gray-50">
            <p className="font-semibold mb-2">Detail Event</p>

            <input type="date" name="eventDate" onChange={handleChange} className="w-full border p-2 rounded mb-2" />

            <input type="time" name="startTime" onChange={handleChange} className="w-full border p-2 rounded mb-2" />

            <input type="time" name="endTime" onChange={handleChange} className="w-full border p-2 rounded" />
          </div>

          {/* LOCATION */}
          <div className="border p-4 rounded bg-gray-50">
            <p className="font-semibold mb-2">Lokasi</p>

            <input name="location" placeholder="Alamat lengkap" onChange={handleChange} className="w-full border p-2 rounded mb-2" />

            <input name="city" placeholder="Kota" onChange={handleChange} className="w-full border p-2 rounded" />

            {/* GOOGLE MAPS PREVIEW */}

            <a
  href={`https://www.google.com/maps?q=${encodeURIComponent(
    `${form.location}, ${form.city}`
  )}`}
  target="_blank"
  className="text-blue-500 text-sm mt-2 inline-block"
>
  Buka di Google Maps
</a>
          </div>

          {/* DISKON */}
          <div className="border p-4 rounded bg-gray-50">
            <p className="font-semibold mb-2">Diskon</p>

            <select name="discountType" onChange={handleChange} className="w-full border p-2 rounded mb-2">
              <option value="">Tanpa Diskon</option>
              <option value="PERCENT">Persen (%)</option>
              <option value="FIXED">Nominal (Rp)</option>
            </select>

            <input type="number" name="discountValue" placeholder="Nilai Diskon" onChange={handleChange} className="w-full border p-2 rounded mb-2" disabled={!form.discountType} />

            <input type="date" name="discountStart" onChange={handleChange} className="w-full border p-2 rounded mb-2" disabled={!form.discountType} />

            <input type="date" name="discountEnd" onChange={handleChange} className="w-full border p-2 rounded" disabled={!form.discountType} />
          </div>

          {/* IMAGE */}
          <input type="file" multiple accept="image/*" onChange={handleImageChange} />

          <div className="grid grid-cols-3 gap-3">
            {preview.map((src, i) => (
              <img key={i} src={src} className="h-24 w-full object-cover rounded" />
            ))}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white py-2 rounded">
            {loading ? "Loading..." : "Create Event"}
          </button>
        </form>
      </div>
    </>
  );
}