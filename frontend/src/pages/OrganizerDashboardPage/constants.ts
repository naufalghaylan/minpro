import type { DashboardTab, TransactionStatusFilter } from './types';

export const tabs: Array<{ id: DashboardTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'events', label: 'Manage Events' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'attendees', label: 'Attendee List' },
  { id: 'ratings', label: 'Ratings ⭐' },
];

export const transactionStatuses: TransactionStatusFilter[] = [
  'ALL',
  'PAID',
  'DONE',
  'PENDING',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
];