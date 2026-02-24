import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Column {
  key: string;
  label: string;
}

interface Props {
  data: any[];
  columns: Column[];
  filename?: string;
  disabled?: boolean;
}

export function ExportCSVButton({ data, columns, filename = "relatorio", disabled }: Props) {
  const handleExport = () => {
    if (!data.length) return;

    const header = columns.map((c) => c.label).join(";");
    const rows = data.map((row) =>
      columns.map((c) => {
        const val = row[c.key];
        if (val == null) return "";
        return String(val).replace(/;/g, ",");
      }).join(";")
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={disabled || !data.length} className="h-9">
      <Download className="h-4 w-4 mr-2" />
      Exportar CSV
    </Button>
  );
}
