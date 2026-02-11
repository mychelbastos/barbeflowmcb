import { DateRangeSelector } from "@/components/DateRangeSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileDown, Users } from "lucide-react";

interface UnifiedFiltersProps {
  staff: { id: string; name: string }[];
  staffFilter: string;
  onStaffFilterChange: (value: string) => void;
  onExportPDF: () => void;
  hasData: boolean;
}

export function UnifiedFilters({
  staff,
  staffFilter,
  onStaffFilterChange,
  onExportPDF,
  hasData,
}: UnifiedFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Export PDF button above */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPDF}
          disabled={!hasData}
          className="h-9 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
        >
          <FileDown className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Filter card: Período + Profissional side by side, same style */}
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 md:p-5 ring-1 ring-white/[0.03]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateRangeSelector showTitle={false} className="border-0 bg-transparent p-0" />

          {staff.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-muted-foreground text-xs md:text-sm">Profissional</span>
              <Select value={staffFilter} onValueChange={onStaffFilterChange}>
                <SelectTrigger className="h-10 md:h-11 bg-muted/30 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
