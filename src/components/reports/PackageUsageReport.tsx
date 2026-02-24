import { BarChart3 } from "lucide-react";
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function PackageUsageReport({ tenantId }: Props) { return (<div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground"><BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30"/><p className="font-medium">Relatório em desenvolvimento</p></div>); }
