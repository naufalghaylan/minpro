export type OrganizerDashboardOverview = {
  totalEvents: number;
  pendingPaymentVerifications: number;
  completedTransactions: number;
  totalTicketsSold: number;
  totalRevenue: number;
};

export type OrganizerEventItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  totalSeats: number;
  availableSeats: number;
  eventDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  city?: string | null;
  discountType?: 'PERCENT' | 'FIXED' | null;
  discountValue?: number | null;
  discountStart?: string | null;
  discountEnd?: string | null;
  event_images?: Array<{
    id: string;
    eventId: string;
    url: string;
  }>;
  _count?: {
    orders: number;
  };
};

export type UpdateOrganizerEventPayload = Partial<{
  name: string;
  description: string | null;
  price: number;
  totalSeats: number;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  city: string | null;
  discountType: 'PERCENT' | 'FIXED' | null;
  discountValue: number | null;
  discountStart: string | null;
  discountEnd: string | null;
}>;

export type OrganizerTransactionStatus =
  | 'PENDING'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DONE'
  | 'PAID';

export type OrganizerTransactionItem = {
  id: string;
  status: OrganizerTransactionStatus;
  totalAmount: number;
  paymentProof?: string | null;
  paymentProofUrl?: string | null;
  decisionNote?: string | null;
  decisionAt?: string | null;
  createdAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  order: {
    quantity: number;
    event: {
      id: string;
      name: string;
      city?: string | null;
      eventDate?: string | null;
    };
  };
};

export type OrganizerTransactionsMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type OrganizerStatisticsGroupBy = 'year' | 'month' | 'day';

export type OrganizerStatisticsSeriesItem = {
  bucket: number;
  transactionCount: number;
  ticketsSold: number;
  revenue: number;
};

export type OrganizerStatisticsData = {
  groupBy: OrganizerStatisticsGroupBy;
  year: number | null;
  month: number | null;
  series: OrganizerStatisticsSeriesItem[];
};

export type OrganizerAttendeeItem = {
  transactionId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  ticketQuantity: number;
  totalPricePaid: number;
  purchasedAt: string;
};