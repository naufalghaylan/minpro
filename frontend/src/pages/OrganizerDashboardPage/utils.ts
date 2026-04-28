import { isAxiosError } from 'axios';

export const formatIdr = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export const toDateTimeLocal = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

export const getErrorMessage = (error: unknown) => {
  if (isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) {
      return apiMessage;
    }
  }

  return 'Terjadi kesalahan. Coba lagi.';
};

export const getDecisionCountdown = (paidAt?: string | null, currentTime?: number) => {
  if (!paidAt) return null;

  const now = currentTime || Date.now();
  const paid = new Date(paidAt).getTime();
  const deadline = paid + 48 * 60 * 60 * 1000;
  const remaining = deadline - now;

  if (remaining <= 0) return 'Waktu habis';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  return `${hours}j ${minutes}m ${seconds}s`;
};