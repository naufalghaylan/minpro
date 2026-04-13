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

  const navigate = useNavigate();

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

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />

      {/* 🔥 HERO SEARCH */}
<section className="relative h-[400px] flex items-center justify-center overflow-hidden">
  
  {/* Background Image */}
  <img
    src="/backroundevents.jpg"
    alt="bg"
    className="absolute inset-0 w-full h-full object-cover"
  />

  {/* Overlay */}
  <div className="absolute inset-0 bg-black/50" />

  {/* CONTENT */}
  <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
    
    <h1 className="text-white text-3xl md:text-5xl font-bold drop-shadow-lg">
      ALL ANIME EVENT NOW
    </h1>

    <p className="text-white text-sm md:text-lg mt-2 drop-shadow-md">
      Buruan order agar tidak ketinggalan!!
    </p>

    {/* SEARCH */}
    <div className="bg-white/80 backdrop-blur-md rounded-xl overflow-hidden shadow-lg border mt-6 w-full max-w-2xl flex">
      <input
        type="text"
        placeholder="Cari event."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1 px-4 py-3 rounded-l-lg outline-none"
      />
      <button className="bg-blue-600 text-white px-6 rounded-r-lg">
        Search
      </button>
    </div>

  </div>
</section>

      {/* 🔥 CONTENT */}
      <section className="px-6 py-10 max-w-7xl mx-auto">

        <h2 className="text-2xl font-bold mb-6">
          🎟 Ticket Event Available
        </h2>

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center my-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && events.length === 0 && (
          <p className="text-gray-500">Event tidak ditemukan...</p>
        )}

        {/* GRID */}
        <div className="grid md:grid-cols-3 gap-6">
          {events.map((item) => {
            const image =
              item.event_images?.[0]?.url ||
              "https://via.placeholder.com/300";

            return (
              <div
                key={item.id}
                onClick={() => {
                  setLoadingClick(item.id);
                  setTimeout(() => {
                    navigate(`/order/${item.id}`);
                  }, 500);
                }}
                className="cursor-pointer bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition duration-300"
              >
                {/* IMAGE */}
                <div className="relative">
                  <img
                    src={image}
                    className="h-52 w-full object-cover"
                  />

                  {/* LOADING CLICK */}
                  {loadingClick === item.id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>

                {/* CONTENT */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold">
                    {item.name}
                  </h3>

                  <p className="text-gray-500">
                    Quota: {item.availableSeats}/{item.totalSeats}
                  </p>

                  <div className="flex justify-between items-center mt-4">
                    <span className="text-blue-600 font-bold">
                      Rp {item.price.toLocaleString()}
                    </span>

                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Detail
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