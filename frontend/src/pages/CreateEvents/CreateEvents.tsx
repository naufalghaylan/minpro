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

  pricingType: string;
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
  discountStartDate: string;
  discountStartTime: string;
  discountEndDate: string;
  discountEndTime: string;
}

export default function CreateEvent() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<EventForm>({
    name: "",
    description: "",

    pricingType: "PAID",
    price: "",
    totalSeats: "",

    eventDate: "",
    startTime: "",
    endTime: "",

    location: "",
    city: "",

    discountType: "",
    discountValue: "",
    discountStartDate: "",
    discountStartTime: "",
    discountEndDate: "",
    discountEndTime: "",
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

      // Combine discount date and time into datetime strings
      const discountStart = (form.discountStartDate && form.discountStartTime)
        ? `${form.discountStartDate}T${form.discountStartTime}:00`
        : "";
      const discountEnd = (form.discountEndDate && form.discountEndTime)
        ? `${form.discountEndDate}T${form.discountEndTime}:00`
        : "";

      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("pricingType", form.pricingType);
      formData.append("price", form.pricingType === "FREE" ? "0" : form.price);
      formData.append("totalSeats", form.totalSeats);
      formData.append("eventDate", form.eventDate);
      formData.append("startTime", form.startTime);
      formData.append("endTime", form.endTime);
      formData.append("location", form.location);
      formData.append("city", form.city);
      formData.append("discountType", form.discountType);
      formData.append("discountValue", form.discountValue);
      formData.append("discountStart", discountStart);
      formData.append("discountEnd", discountEnd);

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
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
             Create Event
          </h1>

          <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-white/20 p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* BASIC */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 border-b pb-2">📝 Informasi Dasar</h2>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Event</label>
                  <input 
                    name="name" 
                    placeholder="Nama Event" 
                    onChange={handleChange} 
                    className="w-full border-2 border-gray-300 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi Event</label>
                  <textarea 
                    name="description" 
                    placeholder="Deskripsi Event" 
                    onChange={handleChange} 
                    className="w-full border-2 border-gray-300 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none resize-none h-32 transition" 
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tipe Harga</label>
                    <select
                      name="pricingType"
                      onChange={handleChange}
                      className="w-full border-2 border-gray-300 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition"
                      required
                    >
                      <option value="PAID">Berbayar (PAID)</option>
                      <option value="FREE">Gratis (FREE)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Total Seats</label>
                    <input
                      type="number"
                      name="totalSeats"
                      placeholder="Total Seats"
                      onChange={handleChange}
                      className="w-full border-2 border-gray-300 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition"
                      required
                    />
                  </div>
                </div>

                {form.pricingType === "PAID" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Harga</label>
                    <input
                      type="number"
                      name="price"
                      placeholder="Harga"
                      onChange={handleChange}
                      className="w-full border-2 border-gray-300 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition"
                      required
                    />
                  </div>
                )}
              </div>

              {/* EVENT DETAIL */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 border-b pb-2">📅 Detail Event</h2>
                
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal</label>
                      <input 
                        type="date" 
                        name="eventDate" 
                        onChange={handleChange} 
                        className="w-full border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Waktu Mulai</label>
                      <input 
                        type="time" 
                        name="startTime" 
                        onChange={handleChange} 
                        className="w-full border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Waktu Selesai</label>
                      <input 
                        type="time" 
                        name="endTime" 
                        onChange={handleChange} 
                        className="w-full border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* LOCATION */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 border-b pb-2">📍 Lokasi</h2>
                
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Alamat lengkap</label>
                      <input 
                        name="location" 
                        placeholder="Alamat lengkap" 
                        onChange={handleChange} 
                        className="w-full border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Kota</label>
                      <input 
                        name="city" 
                        placeholder="Kota" 
                        onChange={handleChange} 
                        className="w-full border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition" 
                      />
                    </div>
                  </div>

                  {/* GOOGLE MAPS PREVIEW */}
                  <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(
                      `${form.location}, ${form.city}`
                    )}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700 transition"
                  >
                    🗺️ Buka di Google Maps
                  </a>
                </div>
              </div>

              {/* DISKON */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 border-b pb-2">💰 Diskon</h2>
                
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tipe Diskon</label>
                      <select 
                        name="discountType" 
                        onChange={handleChange} 
                        className="w-full border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition"
                      >
                        <option value="">Tanpa Diskon</option>
                        <option value="PERCENT">Persen (%)</option>
                        <option value="FIXED">Nominal (Rp)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Nilai Diskon</label>
                      <input 
                        type="number" 
                        name="discountValue" 
                        placeholder="Nilai Diskon" 
                        onChange={handleChange} 
                        className="w-full border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition disabled:bg-gray-200 disabled:cursor-not-allowed" 
                        disabled={!form.discountType} 
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Mulai Diskon</label>
                      <input
                        type="date"
                        name="discountStartDate"
                        onChange={handleChange}
                        className="w-full border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition disabled:bg-gray-200 disabled:cursor-not-allowed"
                        disabled={!form.discountType}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Jam Mulai Diskon</label>
                      <input
                        type="time"
                        name="discountStartTime"
                        onChange={handleChange}
                        className="w-full border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition disabled:bg-gray-200 disabled:cursor-not-allowed"
                        disabled={!form.discountType}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Selesai Diskon</label>
                      <input
                        type="date"
                        name="discountEndDate"
                        onChange={handleChange}
                        className="w-full border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition disabled:bg-gray-200 disabled:cursor-not-allowed"
                        disabled={!form.discountType}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Jam Selesai Diskon</label>
                      <input
                        type="time"
                        name="discountEndTime"
                        onChange={handleChange}
                        className="w-full border-2 border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 outline-none transition disabled:bg-gray-200 disabled:cursor-not-allowed"
                        disabled={!form.discountType}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* IMAGE */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 border-b pb-2">🖼️ Gambar Event</h2>
                
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition cursor-pointer">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    className="w-full"
                  />
                  <p className="text-gray-500 text-sm mt-2">Klik untuk upload gambar (maksimal 3 gambar)</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {preview.map((src, i) => (
                    <div key={i} className="relative group">
                      <img src={src} className="h-32 w-full object-cover rounded-xl shadow-md" />
                      <button
                        type="button"
                        onClick={() => {
                          setImages(images.filter((_, idx) => idx !== i));
                          setPreview(preview.filter((_, idx) => idx !== i));
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating...
                  </span>
                ) : (
                  "Create Event 🚀"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}