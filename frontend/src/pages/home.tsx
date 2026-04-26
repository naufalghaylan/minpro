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
  const BASE_URL = "http://localhost:3000";

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
        "http://localhost:3000/events"
      );

      // 🔥 FILTER + SORT DISKON TERBESAR
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
        .sort((a, b) => b.discount - a.discount) // 🔥 terbesar dulu
        .slice(0, 3);

      setEvents(discountEvents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FORMAT COUNTDOWN
 const getCountdown = (end?: string | null) => {
    if (!end) return null;

    const distance = new Date(end).getTime() - time;
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

        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-wide drop-shadow-xl">
            ANIMEKU.ID
          </h1>

          <p className="mt-4 text-lg text-gray-200">
            Temukan Event Anime Terbaik 🔥
          </p>
        </div>
      </section>

      {/* DISCOUNT SECTION */}
      <section className="px-6 py-16 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-10 text-center md:text-left">
          💸 Flash Discount Event
        </h2>

        {!loading && events.length === 0 && (
          <p className="text-gray-500 text-center">
            Tidak ada event diskon...
          </p>
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
                className={`bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-2 transition duration-300 ${isEnded ? 'opacity-75' : ''}`}
              >
                {/* IMAGE */}
                <div className="relative">
                  <img
                    src={image}
                    alt={item.name}
                    className="h-56 w-full object-cover"
                  />

                  {/* 🔥 DISCOUNT BADGE */}
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-3 py-1 rounded-full shadow">
                    {discountPercent}% OFF
                  </span>

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

                  {/* 🔥 COUNTDOWN */}
                  <span className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    ⏰ {getCountdown(item.discountEnd)}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold line-clamp-1">
                    {item.name}
                  </h3>

                  <p className="text-gray-500 text-sm mt-1">
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

                  {/* PRICE */}
                  <div className="mt-3">
                    <span className="text-gray-400 line-through text-sm block">
                      Rp {item.price.toLocaleString()}
                    </span>

                    <span className="text-blue-600 font-bold text-xl">
                      Rp {(item.finalPrice ?? item.price).toLocaleString()}
                    </span>
                  </div>

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