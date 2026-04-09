import { Link } from "react-router-dom";

const concerts = [
  {
    id: 1,
    name: "Coldplay World Tour",
    price: 1500000,
    image: "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2",
    location: "Jakarta",
  },
  {
    id: 2,
    name: "Arctic Monkeys Live",
    price: 1200000,
    image: "https://images.unsplash.com/photo-1497032205916-ac775f0649ae",
    location: "Bali",
  },
  {
    id: 3,
    name: "Bruno Mars Night",
    price: 1800000,
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
    location: "Surabaya",
  },
];

export default function Home() {
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
          {concerts.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 hover:scale-105"
            >
              <img
                src={item.image}
                alt={item.name}
                className="h-52 w-full object-cover"
              />

              <div className="p-4">
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="text-gray-500">{item.location}</p>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-blue-600 font-bold">
                    Rp {item.price.toLocaleString()}
                  </span>

                  <Link to={`/detail/${item.id}`}>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                      Beli
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
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