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

  const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000");
  const navigate = useNavigate();
console.log(events);
  // 🔥 countdown trigger re-render tiap detik (WIB timezone)
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
        `${import.meta.env.VITE_API_BASE_URL || (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000")}/events`,
        {
          params: { search: debouncedSearch },
        }
      );

      // Sort events: ended events at bottom, others at top
      const sortedEvents = res.data.sort((a, b) => {
        const isEndedA = a.status === "ENDED";
        const isEndedB = b.status === "ENDED";

        if (isEndedA && !isEndedB) return 1;
        if (!isEndedA && isEndedB) return -1;
        return 0;
      });

      setEvents(sortedEvents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 helper countdown (WIB timezone)
  const getCountdown = (endDate?: string | null) => {
    if (!endDate) return null;

    // Convert current time to WIB (UTC+7)
    const utc = now + (new Date().getTimezoneOffset() * 60000);
    const wibNow = utc + (3600000 * 7);

    // Convert endDate to WIB
    const endTime = new Date(endDate).getTime();
    const utcEnd = endTime + (new Date(endDate).getTimezoneOffset() * 60000);
    const wibEnd = utcEnd + (3600000 * 7);

    const distance = wibEnd - wibNow;

    if (distance <= 0) return "Promo berakhir";

    const hours = Math.floor(distance / (1000 * 60 * 60));
    const minutes = Math.floor((distance / (1000 * 60)) % 60);
    const seconds = Math.floor((distance / 1000) % 60);

    return `${hours}j ${minutes}m ${seconds}d`;
  };

  return (
    <div className="bg-gradient-to-b from-gray-100 to-gray-200 min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative h-[450px] flex items-center justify-center overflow-hidden">
        <img
          src="/backroundevents.jpg"
          alt="bg"
          className="absolute inset-0 w-full h-full object-cover transform scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/80" />

        <div className="relative z-10 flex flex-col items-center text-center px-4">
          <h1 className="text-white text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-300">
            ALL ANIME EVENT NOW
          </h1>

          <p className="text-white text-lg md:text-xl mb-8 font-medium">
            🎉 Buruan order agar tidak ketinggalan!!
          </p>

          <div className="bg-white/90 backdrop-blur-xl rounded-2xl mt-6 w-full max-w-2xl flex shadow-2xl overflow-hidden">
            <input
              type="text"
              placeholder="Cari event atau kota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-6 py-4 outline-none text-gray-700 placeholder-gray-500"
            />
            <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 font-semibold transition-all duration-300">
              🔍 Search
            </button>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="px-6 py-16 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">
          🎟️ Ticket Event Available
        </h2>

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center my-10">
            <div className="animate-spin h-12 w-12 border-b-4 border-blue-600 rounded-full"></div>
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 text-center shadow-xl">
            <p className="text-gray-500 text-lg">Event tidak ditemukan...</p>
          </div>
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
          setLoadingClick(item.id);
          setTimeout(() => {
            navigate(`/order/${item.id}`);
          }, 500);
        }}
        className={`cursor-pointer bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-white/20 ${isEnded ? 'opacity-75' : ''}`}
      >
        {/* IMAGE */}
        <div className="relative">
          <img src={image} className="h-64 w-full object-cover transform hover:scale-105 transition-transform duration-500" />

          {/* 🔥 STATUS BADGE */}
          <span
            className={`absolute top-4 right-4 text-xs font-bold px-4 py-2 rounded-full text-white shadow-md ${
              isEnded
                ? "bg-gray-500"
                : isOngoing
                ? "bg-gradient-to-r from-green-500 to-emerald-500"
                : "bg-gradient-to-r from-blue-500 to-indigo-500"
            }`}
          >
            {isEnded && "ENDED"}
            {isOngoing && "ONGOING"}
            {isUpcoming && "UPCOMING"}
          </span>

          {/* 🔥 % DISCOUNT */}
          {isDiscount && (
            <span className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-pulse">
              {discountPercent}% OFF
            </span>
          )}

          {/* 🔥 COUNTDOWN */}
          {isDiscount && countdown && (
            <span className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-2 rounded-lg">
              ⏰ {countdown}
            </span>
          )}

          {/* LOADING */}
          {loadingClick === item.id && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center">
              <div className="animate-spin h-10 w-10 border-b-3 border-white rounded-full"></div>
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="p-6">
          <h3 className="text-xl font-bold line-clamp-1 text-gray-800 mb-2">
            {item.name}
          </h3>

          <p className="text-gray-500 text-sm mb-1">
            📍 {item.city || "Unknown Location"}
          </p>

          <p className="text-gray-600 text-sm mb-3">
            🎫 Quota: {item.availableSeats}/{item.totalSeats}
          </p>

          {/* 🔥 STATUS TEXT */}
          {isEnded && (
            <p className="text-gray-500 text-xs mb-2">
              ❌ Event sudah selesai
            </p>
          )}

          {isOngoing && (
            <p className="text-green-600 text-xs mb-2 font-semibold animate-pulse">
              🔥 Sedang berlangsung!
            </p>
          )}

          {/* 🔥 PROMO */}
          {isDiscount && (
            <p className="text-red-500 text-xs mb-3 font-semibold animate-pulse">
              🔥 Promo terbatas!
            </p>
          )}

          {/* PRICE */}
          <div className="mt-4">
            {item.pricingType === "FREE" ? (
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500">
                GRATIS
              </span>
            ) : (
              <>
                {isDiscount && (
                  <span className="text-gray-400 line-through text-sm block mb-1">
                    Rp {item.price.toLocaleString()}
                  </span>
                )}

                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  Rp {finalPrice.toLocaleString()}
                </span>
              </>
            )}
          </div>

          {/* 🔥 BUTTON FIX */}
          <button
            disabled={isEnded || isSoldOut}
            className={`mt-6 w-full py-3 rounded-xl text-white font-bold transition-all duration-300 transform hover:scale-[1.02] ${
              isEnded || isSoldOut
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
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