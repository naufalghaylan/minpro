import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import api from "../../api";
import axios from "axios";
import Header from "../../components/navbar";

interface EventForm {
  name: string;
  price: string;
  totalSeats: string;
}

export default function CreateEvent() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<EventForm>({
    name: "",
    price: "",
    totalSeats: "",
  });

  // 🔥 simpan file image
  const [images, setImages] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);

  // 🔥 proteksi role
  useEffect(() => {
    if (user === null) return;

    if (!user) {
      navigate("/login");
    } else if (user.role !== "EVENT_ORGANIZER") {
      navigate("/");
    }
  }, [user, navigate]);

  // 🔥 input text
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if ((name === "price" || name === "totalSeats") && Number(value) < 0) {
      return;
    }

    setForm({ ...form, [name]: value });
  };

  // 🔥 upload image
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);

    setImages(fileArray);

    // preview image
    const previewUrls = fileArray.map((file) =>
      URL.createObjectURL(file)
    );
    setPreview(previewUrls);
  };

  // 🔥 submit pakai FormData
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("name", form.name);
      formData.append("price", form.price);
      formData.append("totalSeats", form.totalSeats);

      // multiple images
      images.forEach((file) => {
        formData.append("images", file);
      });

      await api.post("/events", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Event berhasil dibuat 🚀");
      navigate("/");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.log(err.response);
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
    <Header/>
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


{/* 🔥 Upload Image */}
<div>
  <p className="font-semibold mb-2">Upload Images</p>

  {/* Upload Box */}
  <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
    
    <span className="mb-3 text-sm text-gray-500">
      Klik untuk upload gambar
    </span>

    <span className="px-4 py-2 bg-black text-white rounded-md shadow hover:bg-gray-800 transition">
      Browse Files
    </span>

    <input
      type="file"
      multiple
      accept="image/*"
      onChange={handleImageChange}
      className="hidden"
    />
  </label>

  {/* Preview + Remove */}
  <div className="grid grid-cols-3 gap-3 mt-4">
    {preview.map((src, i) => (
      <div key={i} className="relative group">
        <img
          src={src}
          alt="preview"
          className="h-24 w-full object-cover rounded-lg shadow"
        />

        {/* ❌ Remove button */}
        <button
          type="button"
          onClick={() => {
            const newImages = images.filter((_, index) => index !== i);
            const newPreview = preview.filter((_, index) => index !== i);

            setImages(newImages);
            setPreview(newPreview);
          }}
          className="absolute top-1 right-1 bg-black text-white text-xs px-2 py-1 rounded-full opacity-80 hover:opacity-100"
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
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          {loading ? "Loading..." : "Create Event"}
        </button>
      </form>
    </div></>
  );
}