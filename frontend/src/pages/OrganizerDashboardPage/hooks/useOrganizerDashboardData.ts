import { isAxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../../api';
import { useAuthStore } from '../../../store/auth';
import {
  getOrganizerAttendees,
  getOrganizerEvents,
  getOrganizerOverview,
  getOrganizerStatistics,
  getOrganizerTransactions,
} from '../../../api/organizer-dashboard';
import type {
  OrganizerAttendeeItem,
  OrganizerDashboardOverview,
  OrganizerEventItem,
  OrganizerStatisticsData,
  OrganizerStatisticsGroupBy,
  OrganizerTransactionItem,
  OrganizerTransactionStatus,
  OrganizerTransactionsMeta,
} from '../../../types/organizer-dashboard';
import type { RatingItem } from '../types';
import { getErrorMessage } from '../utils';

type OrganizerDashboardNotifier = (message: string) => void;

type GetTransactionsArgs = {
  page?: number;
  limit?: number;
  status?: OrganizerTransactionStatus;
  eventId?: string;
};

type GetStatisticsArgs = {
  groupBy: OrganizerStatisticsGroupBy;
  year?: number;
  month?: number;
  eventId?: string;
};

export const useOrganizerDashboardData = (reportError: OrganizerDashboardNotifier) => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [overview, setOverview] = useState<OrganizerDashboardOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [events, setEvents] = useState<OrganizerEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [transactions, setTransactions] = useState<OrganizerTransactionItem[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionMeta, setTransactionMeta] = useState<OrganizerTransactionsMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [statistics, setStatistics] = useState<OrganizerStatisticsData | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  const [attendees, setAttendees] = useState<OrganizerAttendeeItem[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [avgRating, setAvgRating] = useState(0);

  const fetchOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const data = await getOrganizerOverview();
      if (!isMountedRef.current) {
        return;
      }
      setOverview(data);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      reportError(getErrorMessage(error));
    } finally {
      if (!isMountedRef.current) {
        return;
      }
      setOverviewLoading(false);
    }
  }, [reportError]);

  const fetchEvents = useCallback(async () => {
    try {
      setEventsLoading(true);
      const data = await getOrganizerEvents();
      if (!isMountedRef.current) {
        return;
      }
      setEvents(data);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      reportError(getErrorMessage(error));
    } finally {
      if (!isMountedRef.current) {
        return;
      }
      setEventsLoading(false);
    }
  }, [reportError]);

  const fetchTransactions = useCallback(
    async ({ page = 1, limit = 10, status, eventId }: GetTransactionsArgs = {}) => {
      try {
        setTransactionsLoading(true);
        const result = await getOrganizerTransactions({
          status,
          eventId,
          page,
          limit,
        });
        if (!isMountedRef.current) {
          return;
        }
        setTransactions(result.data);
        setTransactionMeta(result.meta);
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }
        reportError(getErrorMessage(error));
      } finally {
        if (!isMountedRef.current) {
          return;
        }
        setTransactionsLoading(false);
      }
    },
    [reportError]
  );

  const fetchStatistics = useCallback(
    async ({ groupBy, year, month, eventId }: GetStatisticsArgs) => {
      try {
        setStatisticsLoading(true);
        const data = await getOrganizerStatistics({
          groupBy,
          year,
          month,
          eventId,
        });
        if (!isMountedRef.current) {
          return;
        }
        setStatistics(data);
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }
        reportError(getErrorMessage(error));
      } finally {
        if (!isMountedRef.current) {
          return;
        }
        setStatisticsLoading(false);
      }
    },
    [reportError]
  );

  const fetchAttendees = useCallback(
    async (eventId?: string) => {
      if (!eventId) {
        setAttendees([]);
        return;
      }

      try {
        setAttendeesLoading(true);
        const data = await getOrganizerAttendees(eventId);
        if (!isMountedRef.current) {
          return;
        }
        setAttendees(data);
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }
        reportError(getErrorMessage(error));
      } finally {
        if (!isMountedRef.current) {
          return;
        }
        setAttendeesLoading(false);
      }
    },
    [reportError]
  );

  const fetchRatings = useCallback(async () => {
    try {
      setRatingsLoading(true);

      const token = useAuthStore.getState().token;
      let response: { data: RatingItem[] | { data: RatingItem[] } } | null = null;
      const endpointCandidates = ['/api/ratings/organizer', '/ratings/organizer'];

      for (const endpoint of endpointCandidates) {
        try {
          response = await api.get<RatingItem[] | { data: RatingItem[] }>(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          break;
        } catch (error) {
          if (!isAxiosError(error) || error.response?.status !== 404) {
            throw error;
          }
        }
      }

      if (!response) {
        throw new Error('Ratings endpoint not found');
      }

      const data = Array.isArray(response.data) ? response.data : response.data.data;
      if (!isMountedRef.current) {
        return;
      }
      setRatings(data);

      if (data.length > 0) {
        const average = data.reduce((accumulator, item) => accumulator + item.rating, 0) / data.length;
        if (!isMountedRef.current) {
          return;
        }
        setAvgRating(Number(average.toFixed(1)));
      } else {
        if (!isMountedRef.current) {
          return;
        }
        setAvgRating(0);
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      reportError(getErrorMessage(error));
    } finally {
      if (!isMountedRef.current) {
        return;
      }
      setRatingsLoading(false);
    }
  }, [reportError]);

  return {
    overview,
    overviewLoading,
    events,
    eventsLoading,
    transactions,
    transactionsLoading,
    transactionMeta,
    statistics,
    statisticsLoading,
    attendees,
    attendeesLoading,
    ratings,
    ratingsLoading,
    avgRating,
    fetchOverview,
    fetchEvents,
    fetchTransactions,
    fetchStatistics,
    fetchAttendees,
    fetchRatings,
  };
};