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
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 md:p-5 ring-1 ring-white/[0.03]">
        {/* Row 1: Período + Profissional side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateRangeSelector showTitle={false} className="border-0 bg-transparent p-0" />

          {staff.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground/70 font-medium">Profissional</span>
              </div>
              <Select value={staffFilter} onValueChange={onStaffFilterChange}>
                <SelectTrigger className="h-10 md:h-11 bg-muted/30 border-border/50 text-foreground hover:bg-muted/50 transition-colors">
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
    </div>
  );
}
