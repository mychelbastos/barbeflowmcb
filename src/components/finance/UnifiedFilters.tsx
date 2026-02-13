import { DateRangeSelector } from "@/components/DateRangeSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface UnifiedFiltersProps {
  staff: { id: string; name: string }[];
  staffFilter: string;
  onStaffFilterChange: (value: string) => void;
  onExportPDF: () => void;
  hasData: boolean;
}

export function UnifiedFilters({ staff, staffFilter, onStaffFilterChange, onExportPDF, hasData }: UnifiedFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPDF}
          disabled={!hasData}
          className="h-9"
        >
          <FileDown className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-2xl glass-panel p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateRangeSelector showTitle={false} className="border-0 bg-transparent p-0 shadow-none" />

          {staff.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-muted-foreground text-xs font-medium">Profissional</span>
              <Select value={staffFilter} onValueChange={onStaffFilterChange}>
                <SelectTrigger className="h-10 md:h-11 text-sm rounded-xl">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
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
