import { DateRangeSelector } from "@/components/DateRangeSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Users } from "lucide-react";

interface UnifiedFiltersProps {
  staff: { id: string; name: string }[];
  staffFilter: string;
  onStaffFilterChange: (value: string) => void;
  onExport: () => void;
  hasData: boolean;
}

export function UnifiedFilters({
  staff,
  staffFilter,
  onStaffFilterChange,
  onExport,
  hasData,
}: UnifiedFiltersProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
        {/* Date Range - takes most space */}
        <div className="flex-1 min-w-0">
          <DateRangeSelector showTitle={false} className="border-0 bg-transparent p-0" />
        </div>

        {/* Staff Filter */}
        {staff.length > 0 && (
          <div className="w-full md:w-48 flex-shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Users className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-400">Profissional</span>
            </div>
            <Select value={staffFilter} onValueChange={onStaffFilterChange}>
              <SelectTrigger className="h-10 bg-zinc-800/50 border-zinc-700/50 text-zinc-100">
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

        {/* Export Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={!hasData}
          className="flex-shrink-0 h-10 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>
    </div>
  );
}
