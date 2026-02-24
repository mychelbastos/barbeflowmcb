import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useReportFavorites } from "@/hooks/useReportFavorites";
import { REPORT_DEFINITIONS, categoryConfig, categoryOrder } from "@/data/reportDefinitions";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Search, Star, Eye } from "lucide-react";
import type { ReportCategory } from "@/data/reportDefinitions";

export default function Reports() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id || "";
  const { favorites, toggleFavorite, isFavorite } = useReportFavorites(tenantId);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | ReportCategory>("all");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const filteredReports = REPORT_DEFINITIONS.filter((r) => {
    if (category !== "all" && r.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    }
    return true;
  });

  const favoriteReports = REPORT_DEFINITIONS.filter((r) => isFavorite(r.id));

  // Report viewer
  if (selectedReport) {
    const report = REPORT_DEFINITIONS.find((r) => r.id === selectedReport);
    if (!report) return null;
    return (
      <ReportViewer
        report={report}
        tenantId={tenantId}
        onBack={() => setSelectedReport(null)}
        isFavorite={isFavorite(report.id)}
        onToggleFavorite={() => toggleFavorite(report.id)}
      />
    );
  }

  // Group by category
  const grouped = categoryOrder
    .filter((cat) => category === "all" || category === cat)
    .map((cat) => ({
      category: cat,
      reports: filteredReports.filter((r) => r.category === cat),
    }))
    .filter((g) => g.reports.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Selecione um relatório para visualizar</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar relatório..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      {/* Favorites */}
      {favoriteReports.length > 0 && !search && category === "all" && (
        <div>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            Favoritos
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {favoriteReports.map((r) => {
              const cat = categoryConfig[r.category];
              return (
                <Card
                  key={r.id}
                  className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200 group"
                  onClick={() => setSelectedReport(r.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <cat.icon className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-xs text-foreground truncate">{r.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={category === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setCategory("all")}
          className="h-8 text-xs"
        >
          Todos ({REPORT_DEFINITIONS.length})
        </Button>
        {categoryOrder.map((key) => {
          const config = categoryConfig[key];
          const count = REPORT_DEFINITIONS.filter((r) => r.category === key).length;
          return (
            <Button
              key={key}
              variant={category === key ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(key)}
              className="h-8 text-xs"
            >
              <config.icon className="h-3 w-3 mr-1" />
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Report list grouped by category */}
      {grouped.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>Nenhum relatório encontrado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category: cat, reports }) => {
            const config = categoryConfig[cat];
            return (
              <div key={cat}>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <config.icon className="h-3.5 w-3.5" />
                  {config.label}
                </h2>
                <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => setSelectedReport(r.id)}
                    >
                      <button
                        className="shrink-0 p-1 rounded-lg hover:bg-muted/50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(r.id);
                        }}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            isFavorite(r.id)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/40 group-hover:text-muted-foreground"
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{r.name}</span>
                          {r.hasChart && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              📊
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
