import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Header from "../../components/navbar";

export default function OrderPage() {
  const { eventId } = useParams();

  const [event, setEvent] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

useEffect(() => {
  const fetchEvent = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/events/${eventId}`);
      setEvent(res.data);
    } catch (error) {
      console.error("ERROR FETCH EVENT:", error);
    }
  };

  if (eventId) fetchEvent();
}, [eventId]);
  const handleOrder = async () => {
    if (!quantity || quantity < 1) {
      alert("Minimal beli 1 ticket!");
      return;
    }

    try {
     await axios.post(`http://localhost:3000/orders`, {
  customerId: "customerId", 
  eventId: eventId,
  quantity: quantity,
});

      alert("Order berhasil!");
    } catch (err) {
      console.error(err);
      alert("Gagal order");
    }
  };

  if (!event) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div>
      <Header/>
    <div className="min-h-screen flex">
      
      {/* LEFT IMAGE */}
      <div className="w-1/2 hidden md:block">
        <img
          src={event.event_images?.[0]?.url}
          className="w-full h-full object-fill"
        />
      </div>

      {/* RIGHT FORM */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-10">
        <div className="w-full max-w-md">

          <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
          <p className="text-gray-500 mb-6">Checkout Ticket</p>

          {/* PRICE */}
          <div className="mb-4">
            <p className="text-sm text-gray-500">Harga</p>
            <p className="text-lg font-semibold">Rp {event.price}</p>
          </div>

          {/* QUANTITY */}
          <div className="mb-4">
            <label className="text-sm">Jumlah Ticket</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => {
                let val = Number(e.target.value);

                if (!val || val < 1) val = 1;

                setQuantity(val);
              }}
              className="w-full border p-2 rounded mt-1"
            />
          </div>

          {/* TOTAL */}
          <div className="mb-6">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-xl font-bold">
              Rp {event.price * quantity}
            </p>
          </div>

          {/* BUTTON */}
          <button
            onClick={handleOrder}
            disabled={quantity < 1}
            className={`w-full py-2 rounded text-white ${
              quantity >= 1
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Checkout
          </button>

        </div>
      </div>
    </div>
    </div>
  );
}