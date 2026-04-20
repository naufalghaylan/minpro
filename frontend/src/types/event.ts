// ==========================
// EVENT IMAGE TYPE
// ==========================
export type event_images = {
  id: string;
  eventId: string;
  url: string;

  created_at?: string;
  updated_at?: string;
};

// ==========================
// EVENT TYPE (MAIN)
// ==========================
export interface Event {
  id: string;
  name: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  city?: string; // 🔥 WAJIB
  // 🔥 DISKON
  discountType?: string | null;
  discountValue?: number | null;
  discountStart?: string | null;
  discountEnd?: string | null;

  // 🔥 HASIL HITUNG BACKEND
  finalPrice?: number;
  status?: "UPCOMING" | "ONGOING" | "ENDED";
  event_images: {
    url: string;
  }[];
}