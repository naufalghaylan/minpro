import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import type { Event } from "../types/event";
import Header from "../components/navbar";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [time, setTime] = useState(Date.now());

  const navigate = useNavigate();
  const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000");

  useEffect(() => {
    getEvents();

    // 🔥 realtime countdown
    const interval = setInterval(() => {
      setTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getEvents = async () => {
    try {
      setLoading(true);

      const res = await axios.get<Event[]>(
        `${import.meta.env.VITE_API_BASE_URL || (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000")}/events`
      );

      // 🔥 FILTER + SORT DISKON TERBESAR + ENDED AT BOTTOM
      const discountEvents = res.data
        .map((item) => {
          const finalPrice = item.finalPrice ?? item.price;
          const discount = item.price - finalPrice;

          return {
            ...item,
            finalPrice,
            discount,
          };
        })
        .filter((item) => item.discount > 0)
        .sort((a, b) => {
          // Sort by ended status first (ended at bottom)
          const isEndedA = a.status === "ENDED";
          const isEndedB = b.status === "ENDED";

          if (isEndedA && !isEndedB) return 1;
          if (!isEndedA && isEndedB) return -1;

          // Then sort by discount amount (largest first)
          return b.discount - a.discount;
        })
        .slice(0, 3);

      setEvents(discountEvents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FORMAT COUNTDOWN (WIB timezone)
  const getCountdown = (end?: string | null) => {
    if (!end) return null;

    // Convert current time to WIB (UTC+7)
    const utc = time + (new Date().getTimezoneOffset() * 60000);
    const wibNow = utc + (3600000 * 7);

    // Convert endDate to WIB
    const endTime = new Date(end).getTime();
    const utcEnd = endTime + (new Date(end).getTimezoneOffset() * 60000);
    const wibEnd = utcEnd + (3600000 * 7);

    const distance = wibEnd - wibNow;
    if (distance <= 0) return "Berakhir";

    const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((distance / (1000 * 60)) % 60);
    const seconds = Math.floor((distance / 1000) % 60);

    return `${hours}j ${minutes}m ${seconds}d`;
  };

  return (
    <div className="bg-gradient-to-b from-gray-100 to-gray-200 min-h-screen">
      <Header />

      {/* HERO */}
      <section className="h-[70vh] relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute w-full h-full object-cover"
        >
          <source src="/videos/backround_home.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 backdrop-blur-sm" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-2xl bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-white">
            ANIMEKU.ID
          </h1>

          <p className="mt-6 text-xl md:text-2xl text-gray-200 font-medium tracking-wide">
            Temukan Event Anime Terbaik 🔥
          </p>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => navigate("/events")}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Jelajahi Event
            </button>
          </div>
        </div>
      </section>

      {/* DISCOUNT SECTION */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-3">
             Flash Discount Event
          </h2>
          <p className="text-gray-600 text-lg">
            Dapatkan harga spesial untuk event anime terbaik!
          </p>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-12 text-center">
            <p className="text-gray-500 text-lg">
              Tidak ada event diskon saat ini...
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {events.map((item) => {
            const image = item.event_images?.[0]?.url
              ? `${BASE_URL}/uploads/${item.event_images[0].url}`
              : "/no-image.png";

            const discountPercent = Math.round(
              ((item.price - (item.finalPrice ?? item.price)) /
                item.price) *
                100
            );

            // 🔥 STATUS LOGIC (dari backend)
            const isEnded = item.status === "ENDED";
            const isOngoing = item.status === "ONGOING";
            const isUpcoming = item.status === "UPCOMING";
            const isSoldOut = item.availableSeats === 0;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isEnded) return;
                  navigate(`/order/${item.id}`);
                }}
                className={`bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-white/20 ${isEnded ? 'opacity-75' : ''}`}
              >
                {/* IMAGE */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={image}
                    alt={item.name}
                    className="h-full w-full object-cover transform hover:scale-110 transition-transform duration-500"
                  />

                  {/* 🔥 DISCOUNT BADGE */}
                  <span className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg animate-pulse">
                    {discountPercent}% OFF
                  </span>

                  {/* 🔥 STATUS BADGE */}
                  <span
                    className={`absolute top-4 right-4 text-xs font-bold px-3 py-1.5 rounded-full text-white shadow-md ${
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

                  {/* 🔥 COUNTDOWN */}
                  {item.discountEnd && (
                    <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white text-sm font-semibold px-3 py-1.5 rounded-lg shadow-md">
                      ⏰ {getCountdown(item.discountEnd)}
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 line-clamp-2 mb-2">
                    {item.name}
                  </h3>

                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
                    <span>📍</span>
                    <span className="truncate">{item.city || "Unknown Location"}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                    <span>🎫</span>
                    <span>Quota: {item.availableSeats}/{item.totalSeats}</span>
                  </div>

                  {/* 🔥 STATUS TEXT */}
                  {isEnded && (
                    <div className="mb-4 bg-gray-100 rounded-lg px-3 py-2">
                      <p className="text-gray-600 text-sm font-medium">
                        ❌ Event sudah selesai
                      </p>
                    </div>
                  )}

                  {isOngoing && (
                    <div className="mb-4 bg-green-50 rounded-lg px-3 py-2">
                      <p className="text-green-600 text-sm font-medium animate-pulse">
                        🔥 Sedang berlangsung!
                      </p>
                    </div>
                  )}

                  {/* PRICE */}
                  <div className="flex items-baseline gap-2 mb-4">
                    {item.pricingType === "FREE" ? (
                      <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500">
                        GRATIS
                      </span>
                    ) : (
                      <>
                        <span className="text-gray-400 line-through text-sm">
                          Rp {item.price.toLocaleString()}
                        </span>

                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                          Rp {(item.finalPrice ?? item.price).toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    disabled={isEnded || isSoldOut}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] ${
                      isEnded || isSoldOut
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl"
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