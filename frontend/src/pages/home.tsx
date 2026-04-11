import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import type { Event } from "../types/event";

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    getEvents();
  }, []);

  const getEvents = async () => {
    try {
      const res = await axios.get<Event[]>("http://localhost:3000/events");
      setEvents(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* HERO */}
      <section
        className="h-[70vh] bg-cover bg-center relative"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2')",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold">
            Temukan Konser Favoritmu 🎵
          </h1>
          <p className="mt-4 text-lg">
            Booking tiket konser dengan mudah & cepat
          </p>

          {/* SEARCH */}
          <div className="mt-6 bg-white rounded-xl p-2 flex w-full max-w-xl shadow-lg">
            <input
              type="text"
              placeholder="Cari konser atau kota..."
              className="flex-1 px-3 py-2 outline-none text-black"
            />
            <button className="bg-blue-600 text-white px-6 rounded-lg">
              Cari
            </button>
          </div>
        </div>
      </section>

      {/* TRENDING */}
      <section className="px-6 py-10 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">🔥 Trending Concert</h2>

        <div className="grid md:grid-cols-3 gap-6">
          {events.map((item) => {
            const image =
              item.event_images?.[0]?.url ||
              "https://via.placeholder.com/300";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 hover:scale-105"
              >
                <img
                  src={image}
                  alt={item.name}
                  className="h-52 w-full object-cover"
                />

                <div className="p-4">
                  <h3 className="text-lg font-semibold">{item.name}</h3>

                  {/* tambahan info dari backend */}
                  <p className="text-gray-500">
                    Quota: {item.availableSeats}/{item.totalSeats}
                  </p>

                  <div className="flex justify-between items-center mt-4">
                    <span className="text-blue-600 font-bold">
                      Rp {item.price.toLocaleString()}
                    </span>

                      <button
                       onClick={() => navigate(`/order/${item.id}`)}
                        disabled={item.availableSeats === 0}
                        className={`px-4 py-2 rounded-lg text-white ${
                          item.availableSeats === 0
                            ? "bg-gray-400"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {item.availableSeats === 0 ? "Sold Out" : "Beli"}
                      </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PROMO */}
      <section className="bg-blue-600 text-white py-12 text-center">
        <h2 className="text-3xl font-bold">
          Diskon Spesial Hari Ini 🎉
        </h2>
        <p className="mt-2">
          Dapatkan tiket konser dengan harga terbaik!
        </p>
      </section>
    </div>
  );
}