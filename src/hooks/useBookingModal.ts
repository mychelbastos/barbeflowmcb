import { create } from 'zustand';

interface BookingModalState {
  isOpen: boolean;
  initialStaffId?: string;
  initialDate?: string;
  initialTime?: string;
  customerPackageId?: string | null;
  customerSubscriptionId?: string | null;
  allowedServiceIds?: string[] | null;
  preselectedCustomerId?: string | null;
  openBookingModal: (prefill?: {
    staffId?: string;
    date?: string;
    time?: string;
    customerPackageId?: string;
    customerSubscriptionId?: string;
    allowedServiceIds?: string[];
    preselectedCustomerId?: string;
  }) => void;
  closeBookingModal: () => void;
}

export const useBookingModal = create<BookingModalState>((set) => ({
  isOpen: false,
  initialStaffId: undefined,
  initialDate: undefined,
  initialTime: undefined,
  customerPackageId: null,
  customerSubscriptionId: null,
  allowedServiceIds: null,
  preselectedCustomerId: null,
  openBookingModal: (prefill) =>
    set({
      isOpen: true,
      initialStaffId: prefill?.staffId,
      initialDate: prefill?.date,
      initialTime: prefill?.time,
      customerPackageId: prefill?.customerPackageId || null,
      customerSubscriptionId: prefill?.customerSubscriptionId || null,
      allowedServiceIds: prefill?.allowedServiceIds || null,
      preselectedCustomerId: prefill?.preselectedCustomerId || null,
    }),
  closeBookingModal: () =>
    set({
      isOpen: false,
      initialStaffId: undefined,
      initialDate: undefined,
      initialTime: undefined,
      customerPackageId: null,
      customerSubscriptionId: null,
      allowedServiceIds: null,
      preselectedCustomerId: null,
    }),
}));
