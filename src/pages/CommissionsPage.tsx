import { CommissionsTab } from "@/components/CommissionsTab";
import { DateRangeSelector } from "@/components/DateRangeSelector";

export default function CommissionsPage() {
  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <DateRangeSelector className="overflow-x-auto" />
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Comissões</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Cálculo automático de comissões por profissional
        </p>
      </div>
      <CommissionsTab />
    </div>
  );
}
