import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import type { Event } from "../../types/event";
import Header from "../../components/navbar";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingClick, setLoadingClick] = useState<string | null>(null);

  const BASE_URL = "http://localhost:3000";
  const navigate = useNavigate();
console.log(events);
  // 🔥 countdown trigger re-render tiap detik
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    getEvents();
  }, [debouncedSearch]);

  const getEvents = async () => {
    try {
      setLoading(true);

      const res = await axios.get<Event[]>(
        "http://localhost:3000/events",
        {
          params: { search: debouncedSearch },
        }
      );

      setEvents(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 helper countdown
  const getCountdown = (endDate?: string | null) => {
    if (!endDate) return null;

    const distance = new Date(endDate).getTime() - now;

    if (distance <= 0) return "Promo berakhir";

    const hours = Math.floor(distance / (1000 * 60 * 60));
    const minutes = Math.floor((distance / (1000 * 60)) % 60);
    const seconds = Math.floor((distance / 1000) % 60);

    return `${hours}j ${minutes}m ${seconds}d`;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <img
          src="/backroundevents.jpg"
          alt="bg"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 flex flex-col items-center text-center px-4">
          <h1 className="text-white text-3xl md:text-5xl font-bold">
            ALL ANIME EVENT NOW
          </h1>

          <p className="text-white mt-2">
            Buruan order agar tidak ketinggalan!!
          </p>

          <div className="bg-white/80 rounded-xl mt-6 w-full max-w-2xl flex">
            <input
              type="text"
              placeholder="Cari event atau kota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-3 outline-none"
            />
            <button className="bg-blue-600 text-white px-6">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="px-6 py-10 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">
          🎟 Ticket Event Available
        </h2>

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center my-10">
            <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full"></div>
          </div>
        )}

        {!loading && events.length === 0 && (
          <p className="text-gray-500">Event tidak ditemukan...</p>
        )}
{/* GRID */}
<div className="grid md:grid-cols-3 gap-8">
  {events.map((item) => {
    const image = item.event_images?.[0]?.url
      ? `${BASE_URL}/uploads/${item.event_images[0].url}`
      : "/no-image.png";

    const finalPrice = item.finalPrice ?? item.price;
    const isDiscount = finalPrice < item.price;
    const countdown = getCountdown(item.discountEnd);

    const discountPercent = isDiscount
      ? Math.round(((item.price - finalPrice) / item.price) * 100)
      : 0;

    // 🔥 STATUS LOGIC (dari backend)
    const isEnded = item.status === "ENDED";
    const isOngoing = item.status === "ONGOING";
    const isUpcoming = item.status === "UPCOMING";
    const isSoldOut = item.availableSeats === 0;

    return (
      <div
        key={item.id}
        onClick={() => {
          if (isEnded) return; // ❌ ga bisa klik kalau ended
          setLoadingClick(item.id);
          setTimeout(() => {
            navigate(`/order/${item.id}`);
          }, 500);
        }}
        className="cursor-pointer bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-2 transition duration-300"
      >
        {/* IMAGE */}
        <div className="relative">
          <img src={image} className="h-56 w-full object-cover" />

          {/* 🔥 STATUS BADGE */}
          <span
            className={`absolute top-3 right-3 text-xs px-3 py-1 rounded-full text-white ${
              isEnded
                ? "bg-gray-500"
                : isOngoing
                ? "bg-green-500"
                : "bg-blue-500"
            }`}
          >
            {isEnded && "ENDED"}
            {isOngoing && "ONGOING"}
            {isUpcoming && "UPCOMING"}
          </span>

          {/* 🔥 % DISCOUNT */}
          {isDiscount && (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-3 py-1 rounded-full shadow">
              {discountPercent}% OFF
            </span>
          )}

          {/* 🔥 COUNTDOWN */}
          {isDiscount && countdown && (
            <span className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
              ⏰ {countdown}
            </span>
          )}

          {/* LOADING */}
          {loadingClick === item.id && (
            <div className="absolute inset-0 bg-black/50 flex justify-center items-center">
              <div className="animate-spin h-8 w-8 border-b-2 border-white rounded-full"></div>
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="p-5">
          <h3 className="text-lg font-bold line-clamp-1">
            {item.name}
          </h3>

          <p className="text-gray-400 text-sm mt-1">
            📍 {item.city || "Unknown Location"}
          </p>

          <p className="text-gray-500 text-sm">
            Quota: {item.availableSeats}/{item.totalSeats}
          </p>

          {/* 🔥 STATUS TEXT */}
          {isEnded && (
            <p className="text-gray-500 text-xs mt-1">
              ❌ Event sudah selesai
            </p>
          )}

          {isOngoing && (
            <p className="text-green-500 text-xs mt-1 animate-pulse">
              🔥 Sedang berlangsung!
            </p>
          )}

          {/* 🔥 PROMO */}
          {isDiscount && (
            <p className="text-red-500 text-xs mt-1 animate-pulse">
              🔥 Promo terbatas!
            </p>
          )}

          {/* PRICE */}
          <div className="mt-3">
            {isDiscount && (
              <span className="text-gray-400 line-through text-sm block">
                Rp {item.price.toLocaleString()}
              </span>
            )}

            <span className="text-blue-600 font-bold text-xl">
              Rp {finalPrice.toLocaleString()}
            </span>
          </div>

          {/* 🔥 BUTTON FIX */}
          <button
            disabled={isEnded || isSoldOut}
            className={`mt-5 w-full py-2 rounded-xl text-white font-semibold transition ${
              isEnded || isSoldOut
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90"
            }`}
          >
            {isEnded
              ? "Event Selesai"
              : isSoldOut
              ? "Sold Out"
              : "Beli Sekarang"}
          </button>
        </div>
      </div>
    );
  })}
</div>
      </section>
    </div>
  );
}