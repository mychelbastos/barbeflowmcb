import { useState } from "react";
import { useReportsDashboard, calcChange } from "@/hooks/useReportsDashboard";
import { ReportCard } from "./ReportCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  CalendarCheck,
  Users,
  XCircle,
  Trophy,
  Clock,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ReportDateRange } from "./ReportPeriodFilter";

const COLORS = ["#EC4899", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#14B8A6"];

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  );
}

interface Props {
  tenantId: string;
  range: ReportDateRange;
}

export function ReportsDashboard({ tenantId, range }: Props) {
  const [compare, setCompare] = useState(false);
  const { dashboard, prevPeriod } = useReportsDashboard(tenantId, range, compare);
  const data = dashboard.data;
  const prev = prevPeriod.data;
  const loading = dashboard.isLoading;

  const revenueChange = compare && prev ? calcChange(data?.revenue || 0, prev.revenue) : null;
  const bookingsChange = compare && prev ? calcChange(data?.completedBookings || 0, prev.completedBookings) : null;
  const clientsChange = compare && prev ? calcChange(data?.uniqueClients || 0, prev.uniqueClients) : null;
  const cancelledChange = compare && prev ? calcChange(data?.cancelledBookings || 0, prev.cancelledBookings) : null;

  // Ticket médio
  const avgTicket = data && data.completedBookings > 0 ? data.revenue / data.completedBookings : 0;
  const staffTickets = data?.staffRevenue.map((s) => ({
    name: s.name,
    ticket: s.bookings > 0 ? s.revenue / s.bookings : 0,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Compare toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="compare"
          checked={compare}
          onCheckedChange={(v) => setCompare(!!v)}
        />
        <Label htmlFor="compare" className="text-sm text-muted-foreground cursor-pointer">
          Comparar com período anterior
        </Label>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportCard
            icon={DollarSign}
            label="Faturamento"
            value={formatBRL(data.revenue)}
            change={revenueChange?.text}
            changeType={revenueChange?.type}
          />
          <ReportCard
            icon={CalendarCheck}
            label="Atendimentos"
            value={String(data.completedBookings)}
            change={bookingsChange?.text}
            changeType={bookingsChange?.type}
          />
          <ReportCard
            icon={Users}
            label="Clientes Atendidos"
            value={`${data.uniqueClients} atendidos · ${data.newClients} novos`}
            change={clientsChange?.text}
            changeType={clientsChange?.type}
          />
          <ReportCard
            icon={XCircle}
            label="Cancelamentos"
            value={String(data.cancelledBookings)}
            change={cancelledChange?.text}
            changeType={cancelledChange?.type === "positive" ? "negative" : cancelledChange?.type === "negative" ? "positive" : cancelledChange?.type}
          />
        </div>
      ) : null}

      {/* Charts Row 1 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Payment Methods */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Formas de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {data.paymentMethods.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={data.paymentMethods}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {data.paymentMethods.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatBRL(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {data.paymentMethods.map((pm, i) => (
                      <div key={pm.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{pm.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
              )}
            </CardContent>
          </Card>

          {/* Top Services */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Serviços Mais Realizados</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topServices.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart layout="vertical" data={data.topServices} margin={{ left: 0, right: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v} atendimentos`} />
                    <Bar dataKey="count" fill="#EC4899" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
              )}
            </CardContent>
          </Card>

          {/* Staff Revenue */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Faturamento por Profissional</CardTitle>
            </CardHeader>
            <CardContent>
              {data.staffRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart layout="vertical" data={data.staffRevenue} margin={{ left: 0, right: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Bar dataKey="revenue" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts Row 2 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Top Clients */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Melhores Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topClients.length > 0 ? (
                <div className="space-y-2.5">
                  {data.topClients.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{c.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{c.count}x</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
              )}
            </CardContent>
          </Card>

          {/* Daily Bookings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Atendimentos por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              {data.dailyBookings.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.dailyBookings} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => format(parseISO(v), "dd/MM", { locale: ptBR })}
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(v) => format(parseISO(v as string), "dd/MM/yyyy", { locale: ptBR })}
                      formatter={(v: number) => [`${v}`, "Atendimentos"]}
                    />
                    <Line type="monotone" dataKey="count" stroke="#EC4899" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
              )}
            </CardContent>
          </Card>

          {/* Ticket Médio */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Geral</p>
                  <p className="text-xl font-bold text-foreground">{formatBRL(avgTicket)}</p>
                </div>
                {staffTickets.length > 0 && (
                  <div className="space-y-2">
                    {staffTickets.map((s) => (
                      <div key={s.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[120px]">{s.name}</span>
                        <span className="font-medium text-foreground">{formatBRL(s.ticket)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts Row 3 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Gender */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Clientes por Sexo</CardTitle>
            </CardHeader>
            <CardContent>
              {data.genderBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={data.genderBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {data.genderBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {data.genderBreakdown.map((g, i) => (
                      <div key={g.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{g.name} ({g.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
              )}
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Horários Pico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.peakHours.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.peakHours} margin={{ left: -20, right: 8 }}>
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [`${v}`, "Atendimentos"]} />
                    <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
              )}
            </CardContent>
          </Card>

          {/* Return Rate placeholder */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Taxa de Retorno</CardTitle>
            </CardHeader>
            <CardContent>
              {data.completedBookings > 0 ? (
                <div className="space-y-3">
                  <div className="bg-primary/5 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">Clientes Recorrentes</p>
                    <p className="text-xl font-bold text-foreground">
                      {data.uniqueClients > 0
                        ? `${Math.round(((data.uniqueClients - data.newClients) / data.uniqueClients) * 100)}%`
                        : "0%"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-muted/40 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground">{data.uniqueClients - data.newClients}</p>
                      <p className="text-[10px] text-muted-foreground">Retornaram</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground">{data.newClients}</p>
                      <p className="text-[10px] text-muted-foreground">Novos</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
