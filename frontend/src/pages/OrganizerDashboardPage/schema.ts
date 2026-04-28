import { z } from 'zod';

export const editEventSchema = z
  .object({
    name: z.string().trim().min(3, 'Nama event minimal 3 karakter'),
    description: z.string(),
    price: z
      .string()
      .trim()
      .regex(/^\d+$/, 'Harga harus berupa angka'),
    totalSeats: z
      .string()
      .trim()
      .regex(/^\d+$/, 'Total kursi harus berupa angka')
      .refine((value) => Number(value) >= 1, 'Total kursi minimal 1'),
    eventDate: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    location: z.string(),
    city: z.string(),
    discountType: z.enum(['NONE', 'PERCENT', 'FIXED']),
    discountValue: z.string(),
    discountStart: z.string(),
    discountEnd: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.discountType === 'NONE') {
      return;
    }

    if (!value.discountValue || !/^\d+$/.test(value.discountValue) || Number(value.discountValue) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nilai diskon wajib diisi dan harus lebih dari 0',
        path: ['discountValue'],
      });
    }

    if (!value.discountStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tanggal mulai diskon wajib diisi',
        path: ['discountStart'],
      });
    }

    if (!value.discountEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tanggal akhir diskon wajib diisi',
        path: ['discountEnd'],
      });
    }
  });