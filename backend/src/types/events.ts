// ==========================
// EVENT IMAGE TYPE
// ==========================
export type EventImage = {
  id: string;
  eventId?: string; // relasi (opsional kalau ada di response)
  imageUrl: string;

  created_at?: string;
  updated_at?: string;
};

// ==========================
// EVENT TYPE (MAIN)
// ==========================
export type Event = {
  id: string;
  name: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  eventOrganizerId: string;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  event_images: EventImage[];
};