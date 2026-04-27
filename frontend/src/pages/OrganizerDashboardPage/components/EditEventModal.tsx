import type { FieldErrors, UseFormHandleSubmit, UseFormRegister } from 'react-hook-form';
import type { EditEventFormValues } from '../types';

type EditEventModalProps = {
  isOpen: boolean;
  selectedDiscountType: EditEventFormValues['discountType'];
  register: UseFormRegister<EditEventFormValues>;
  errors: FieldErrors<EditEventFormValues>;
  isSubmitting: boolean;
  onClose: () => void;
  handleSubmit: UseFormHandleSubmit<EditEventFormValues>;
  onSubmit: (value: EditEventFormValues) => Promise<void> | void;
};

export function EditEventModal({
  isOpen,
  selectedDiscountType,
  register,
  errors,
  isSubmitting,
  onClose,
  handleSubmit,
  onSubmit,
}: EditEventModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-3 py-6">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Edit Event</h3>
            <p className="text-sm text-slate-500">Perubahan event harus sesuai business rules backend.</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-500">
            Tutup
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            Nama Event
            <input {...register('name')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
          </label>

          <label className="text-sm text-slate-700">
            Harga
            <input
              {...register('price')}
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            {errors.price && <p className="mt-1 text-xs text-rose-600">{errors.price.message}</p>}
          </label>

          <label className="text-sm text-slate-700">
            Total Seats
            <input
              {...register('totalSeats')}
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            {errors.totalSeats && <p className="mt-1 text-xs text-rose-600">{errors.totalSeats.message}</p>}
          </label>

          <label className="text-sm text-slate-700">
            Event Date
            <input
              {...register('eventDate')}
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm text-slate-700">
            Start Time
            <input
              {...register('startTime')}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="09:00"
            />
          </label>

          <label className="text-sm text-slate-700">
            End Time
            <input
              {...register('endTime')}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="17:00"
            />
          </label>

          <label className="text-sm text-slate-700">
            Location
            <input {...register('location')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          <label className="text-sm text-slate-700">
            City
            <input {...register('city')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Description
            <textarea
              {...register('description')}
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm text-slate-700">
            Discount Type
            <select {...register('discountType')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="NONE">No Discount</option>
              <option value="PERCENT">Percent</option>
              <option value="FIXED">Fixed</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Discount Value
            <input
              {...register('discountValue')}
              type="number"
              disabled={selectedDiscountType === 'NONE'}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            />
            {errors.discountValue && <p className="mt-1 text-xs text-rose-600">{errors.discountValue.message}</p>}
          </label>

          <label className="text-sm text-slate-700">
            Discount Start
            <input
              {...register('discountStart')}
              type="datetime-local"
              disabled={selectedDiscountType === 'NONE'}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            />
            {errors.discountStart && <p className="mt-1 text-xs text-rose-600">{errors.discountStart.message}</p>}
          </label>

          <label className="text-sm text-slate-700">
            Discount End
            <input
              {...register('discountEnd')}
              type="datetime-local"
              disabled={selectedDiscountType === 'NONE'}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            />
            {errors.discountEnd && <p className="mt-1 text-xs text-rose-600">{errors.discountEnd.message}</p>}
          </label>

          <div className="md:col-span-2 flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}