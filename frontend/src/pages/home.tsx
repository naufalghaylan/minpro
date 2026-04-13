import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import type { Event } from "../types/event";
import Header from "../components/navbar";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    getEvents();
  }, [ ]);

  const getEvents = async () => {
    try {
      setLoading(true);

      const res = await axios.get<Event[]>(
        "http://localhost:3000/events",
        {
          params: {  },
        }
      );

      setEvents(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />

      {/* HERO */}
      <section className="h-screen relative overflow-hidden">
        
        {/* 🎥 VIDEO */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute w-full h-full object-cover"
        >
          <source src="/videos/backround_home.mp4" type="video/mp4" />
        </video>

        {/* OVERLAY */}
        <div className="absolute inset-0 bg-black/60" />

        {/* CONTENT */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold drop-shadow-lg">
            SELAMAT DATANG DI ANIMEKU.ID
          </h1>

          <p className="mt-3 text-sm md:text-lg text-gray-200">
            TEMPAT PEMBELIAN TICKET EVENT NO 1 DI INDONESIA
          </p>
        </div>
      </section>

      {/* EVENTS */}
      <section className="px-6 py-16 max-w-7xl mx-auto">



        {/* 🔥 TITLE */}
        <h2 className="text-2xl font-bold mb-6 text-center md:text-left">
          🔥 Trending Event
        </h2>

        {/* EMPTY STATE */}
        {!loading && events.length === 0 && (
          <p className="text-gray-500 text-center">
            Event tidak ditemukan...
          </p>
        )}

        {/* GRID */}
        <div className="grid md:grid-cols-3 gap-6">
          {events.slice(0, 3).map((item) => {
            const image =
              item.event_images?.[0]?.url ||
              "https://via.placeholder.com/300";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition duration-300"
              >
                <img
                  src={image}
                  alt={item.name}
                  className="h-52 w-full object-cover"
                />

                <div className="p-4">
                  <h3 className="text-lg font-semibold">{item.name}</h3>

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
                      {item.availableSeats === 0 ? "Sold Out" : "detail"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}