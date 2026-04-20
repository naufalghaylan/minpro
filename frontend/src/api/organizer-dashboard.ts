import api from './index';
import type {
  OrganizerAttendeeItem,
  OrganizerDashboardOverview,
  OrganizerEventItem,
  OrganizerStatisticsData,
  OrganizerStatisticsGroupBy,
  OrganizerTransactionItem,
  OrganizerTransactionStatus,
  OrganizerTransactionsMeta,
  UpdateOrganizerEventPayload,
} from '../types/organizer-dashboard';

type ApiResponse<T> = {
  message: string;
  data: T;
};

type TransactionsResponse = {
  message: string;
  data: OrganizerTransactionItem[];
  meta: OrganizerTransactionsMeta;
};

export type OrganizerTransactionsQuery = {
  status?: OrganizerTransactionStatus;
  eventId?: string;
  page?: number;
  limit?: number;
};

export type OrganizerStatisticsQuery = {
  groupBy?: OrganizerStatisticsGroupBy;
  year?: number;
  month?: number;
};

export const getOrganizerOverview = async (): Promise<OrganizerDashboardOverview> => {
  const response = await api.get<ApiResponse<OrganizerDashboardOverview>>('/organizer/dashboard/overview');
  return response.data.data;
};

export const getOrganizerEvents = async (): Promise<OrganizerEventItem[]> => {
  const response = await api.get<ApiResponse<OrganizerEventItem[]>>('/organizer/dashboard/events');
  return response.data.data;
};

export const updateOrganizerEvent = async (
  eventId: string,
  payload: UpdateOrganizerEventPayload
): Promise<OrganizerEventItem> => {
  const response = await api.patch<ApiResponse<OrganizerEventItem>>(
    `/organizer/dashboard/events/${eventId}`,
    payload
  );
  return response.data.data;
};

export const getOrganizerTransactions = async (
  query: OrganizerTransactionsQuery
): Promise<{ data: OrganizerTransactionItem[]; meta: OrganizerTransactionsMeta }> => {
  const response = await api.get<TransactionsResponse>('/organizer/dashboard/transactions', {
    params: query,
  });

  return {
    data: response.data.data,
    meta: response.data.meta,
  };
};

export const acceptOrganizerTransaction = async (
  transactionId: string,
  reason?: string
): Promise<OrganizerTransactionItem> => {
  const response = await api.post<ApiResponse<OrganizerTransactionItem>>(
    `/organizer/dashboard/transactions/${transactionId}/accept`,
    { reason }
  );
  return response.data.data;
};

export const rejectOrganizerTransaction = async (
  transactionId: string,
  reason?: string
): Promise<OrganizerTransactionItem> => {
  const response = await api.post<ApiResponse<OrganizerTransactionItem>>(
    `/organizer/dashboard/transactions/${transactionId}/reject`,
    { reason }
  );
  return response.data.data;
};

export const getOrganizerStatistics = async (
  query: OrganizerStatisticsQuery
): Promise<OrganizerStatisticsData> => {
  const response = await api.get<ApiResponse<OrganizerStatisticsData>>('/organizer/dashboard/statistics', {
    params: query,
  });
  return response.data.data;
};

export const getOrganizerAttendees = async (eventId: string): Promise<OrganizerAttendeeItem[]> => {
  const response = await api.get<ApiResponse<OrganizerAttendeeItem[]>>(
    `/organizer/dashboard/events/${eventId}/attendees`
  );
  return response.data.data;
};