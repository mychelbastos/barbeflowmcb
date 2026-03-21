import { formatInTimeZone } from "date-fns-tz";
import { AlertTriangle } from "lucide-react";
import type { BookingData, BookingItemData } from "@/hooks/useBookingsByDate";

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
  isSecondary?: boolean;
  currentStaffId?: string;
}

export function BookingCard({ booking, onClick, isRecurring, hasOverlap, isSecondary, currentStaffId }: BookingCardProps) {
  const startTime = formatInTimeZone(new Date(booking.starts_at), TZ, "HH:mm");
  const endTime = formatInTimeZone(new Date(booking.ends_at), TZ, "HH:mm");
  const style = statusStyles[booking.status] || statusStyles.confirmed;

  // Filter items for this staff column, or show all if no currentStaffId
  const allItems = booking.all_items || [];
  const myItems = currentStaffId
    ? allItems.filter(item => item.staff_id === currentStaffId)
    : allItems;

  // Only fallback to booking.service?.name when there are NO all_items at all (data not loaded)
  // If all_items exists but none match this staff, show nothing (don't show wrong service)
  const showFallback = allItems.length === 0;

  return (
    <button
      onClick={onClick}
      className={`w-full h-full rounded-lg px-2 py-1 text-left transition-all hover:brightness-110 cursor-pointer flex flex-col justify-center gap-0 overflow-hidden ${style} ${hasOverlap ? 'ring-1 ring-amber-500/50 ring-inset' : ''} ${isSecondary ? 'border-l-0 border-dashed border border-border opacity-80' : ''}`}
    >
      <div className="flex items-center gap-1 min-w-0">
        {hasOverlap && (
          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
        )}
        <p className="text-[11px] font-semibold text-foreground truncate leading-tight">
          {booking.customer?.name || "Cliente"}
        </p>
        {isSecondary && (
          <span className="flex-shrink-0 text-[8px] font-bold bg-sky-500/20 text-sky-400 px-1 rounded leading-tight">
            Extra
          </span>
        )}
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

      {/* Show filtered service items for this staff column */}
      {myItems.length > 0 ? (
        <div className="flex flex-col gap-0">
          {myItems.map((item, i) => (
            <p key={i} className="text-[10px] text-muted-foreground truncate leading-tight">
              • {item.title}
              {item.paid_status === 'covered' && (
                <span className="text-[8px] text-emerald-500 ml-1">(assinatura)</span>
              )}
            </p>
          ))}
        </div>
      ) : showFallback ? (
        <p className="text-[10px] text-muted-foreground truncate leading-tight">
          {booking.service?.name}
        </p>
      ) : null}

      {/* If secondary, show main staff name */}
      {isSecondary && booking.main_staff_name && (
        <p className="text-[9px] text-muted-foreground/60 truncate leading-tight">
          (Principal: {booking.main_staff_name})
        </p>
      )}

      <p className="text-[10px] text-muted-foreground/70 leading-tight">
        {startTime} - {endTime}
      </p>
    </button>
  );
}
