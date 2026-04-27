import type {
  OrganizerStatisticsGroupBy,
  OrganizerTransactionStatus,
} from '../../types/organizer-dashboard';

export type DashboardTab =
  | 'overview'
  | 'events'
  | 'transactions'
  | 'statistics'
  | 'attendees'
  | 'ratings';

export type StatsQuery = {
  groupBy: OrganizerStatisticsGroupBy;
  year: number;
  month: number;
};

export type EditEventFormValues = {
  name: string;
  description: string;
  price: string;
  totalSeats: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  city: string;
  discountType: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue: string;
  discountStart: string;
  discountEnd: string;
};

export interface RatingItem {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: {
    name: string;
  };
  event: {
    name: string;
  };
}

export type TransactionStatusFilter = OrganizerTransactionStatus | 'ALL';