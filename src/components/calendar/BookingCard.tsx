import { formatInTimeZone } from "date-fns-tz";
import { AlertTriangle } from "lucide-react";
import type { BookingData } from "@/hooks/useBookingsByDate";

const TZ = "America/Bahia";

const statusStyles: Record<string, string> = {
  confirmed: "bg-blue-500/15 border-l-[3px] border-l-blue-500",
  completed: "bg-emerald-500/15 border-l-[3px] border-l-emerald-500",
  pending: "bg-amber-500/15 border-l-[3px] border-l-amber-500",
  no_show: "bg-red-500/15 border-l-[3px] border-l-red-500",
  pending_payment: "bg-purple-500/15 border-l-[3px] border-l-purple-500",
};

interface BookingCardProps {
  booking: BookingData;
  onClick: () => void;
  isRecurring?: boolean;
  hasOverlap?: boolean;
}

export function BookingCard({ booking, onClick, isRecurring, hasOverlap }: BookingCardProps) {
  const startTime = formatInTimeZone(new Date(booking.starts_at), TZ, "HH:mm");
  const endTime = formatInTimeZone(new Date(booking.ends_at), TZ, "HH:mm");
  const style = statusStyles[booking.status] || statusStyles.confirmed;

  return (
    <button
      onClick={onClick}
      className={`w-full h-full rounded-lg px-2 py-1 text-left transition-all hover:brightness-110 cursor-pointer flex flex-col justify-center gap-0 overflow-hidden ${style} ${hasOverlap ? 'ring-1 ring-amber-500/50 ring-inset' : ''}`}
    >
      <div className="flex items-center gap-1 min-w-0">
        {hasOverlap && (
          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
        )}
        <p className="text-[11px] font-semibold text-foreground truncate leading-tight">
          {booking.customer?.name || "Cliente"}
        </p>
        {isRecurring && (
          <span className="flex-shrink-0 text-[8px] font-bold bg-violet-500/20 text-violet-400 px-1 rounded leading-tight">
            Fixo
          </span>
        )}
        {booking.customer_package_id && (
          <span className="flex-shrink-0 text-[8px] font-bold bg-amber-500/20 text-amber-400 px-1 rounded leading-tight">
            Pacote
          </span>
        )}
        {booking.customer_subscription_id && (
          <span className="flex-shrink-0 text-[8px] font-bold bg-primary/20 text-primary px-1 rounded leading-tight">
            Assinatura
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground truncate leading-tight">
        {booking.service?.name}
      </p>
      <p className="text-[10px] text-muted-foreground/70 leading-tight">
        {startTime} - {endTime}
      </p>
    </button>
  );
}
