import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Rocket, DollarSign, Trophy, Shield, BarChart3, Loader2, Smartphone, ChevronRight, Info } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { formatBRL } from "@/utils/formatBRL";
import { NoTenantState } from "@/components/NoTenantState";

interface StaffMember {
  id: string;
  name: string;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getNextSaturday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
}

export default function HighPerformance() {
  usePageTitle("Alta Performance");
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  const [examplePrice, setExamplePrice] = useState(4000);
  const [loyaltyActiveCards, setLoyaltyActiveCards] = useState(0);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Drawer states
  const [discountDrawer, setDiscountDrawer] = useState(false);
  const [loyaltyDrawer, setLoyaltyDrawer] = useState(false);
  const [noShowDrawer, setNoShowDrawer] = useState(false);
  const [summaryDrawer, setSummaryDrawer] = useState(false);

  // Local state for each feature (synced from tenant settings)
  const [saving, setSaving] = useState(false);

  // Discount
  const [discountPercent, setDiscountPercent] = useState(0);

  // Loyalty
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [stampsRequired, setStampsRequired] = useState(10);
  const [durationMonths, setDurationMonths] = useState("none");
  const [rewardType, setRewardType] = useState("free_service");
  const [rewardPercent, setRewardPercent] = useState(50);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // No-show
  const [noShowPercent, setNoShowPercent] = useState(30);
  const [showForfeit, setShowForfeit] = useState(false);
  const [forfeitHours, setForfeitHours] = useState(24);

  // Summary
  const [summaryEnabled, setSummaryEnabled] = useState(true);
  const [altPhone, setAltPhone] = useState("");
  const [showAltField, setShowAltField] = useState(false);

  const settings = (currentTenant?.settings || {}) as Record<string, any>;

  // Load data
  useEffect(() => {
    if (!currentTenant) return;
    const s = currentTenant.settings as any || {};
    setDiscountPercent(s.online_discount_percent || 0);
    setLoyaltyEnabled(s.loyalty_enabled || false);
    setStampsRequired(s.loyalty_stamps_required || 10);
    setDurationMonths(s.loyalty_duration_months ? String(s.loyalty_duration_months) : "none");
    setRewardType(s.loyalty_reward_type || "free_service");
    setRewardPercent(s.loyalty_reward_percent || 50);
    setSelectedStaffIds(s.loyalty_eligible_staff || []);
    setNoShowPercent(s.no_show_forfeit_percent ?? 30);
    setShowForfeit(s.show_cancellation_forfeit ?? false);
    setForfeitHours(s.cancellation_forfeit_hours ?? 24);
    setSummaryEnabled(s.owner_summary_enabled !== false);
    const savedPhone = s.owner_summary_phone || "";
    setAltPhone(savedPhone ? formatPhoneMask(savedPhone) : "");
    setShowAltField(!!savedPhone);

    // Load top service price
    supabase
      .from("services")
      .select("name, price_cents")
      .eq("tenant_id", currentTenant.id)
      .eq("active", true)
      .order("price_cents", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.price_cents) setExamplePrice(data.price_cents);
      });

    // Load loyalty cards count
    supabase
      .from("loyalty_cards")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", currentTenant.id)
      .gt("stamps", 0)
      .then(({ count }) => setLoyaltyActiveCards(count || 0));

    // Load staff
    supabase
      .from("staff")
      .select("id, name")
      .eq("tenant_id", currentTenant.id)
      .eq("active", true)
      .order("name")
      .then(({ data }) => setStaffList(data || []));
  }, [currentTenant]);

  const saveSettings = async (patch: Record<string, any>) => {
    if (!currentTenant) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ settings: { ...currentTenant.settings, ...patch } })
        .eq("id", currentTenant.id);
      if (error) throw error;
      toast({ title: "Salvo com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Toggle handlers
  const handleDiscountToggle = async (on: boolean) => {
    const pct = on ? (discountPercent > 0 ? discountPercent : 10) : 0;
    setDiscountPercent(pct);
    await saveSettings({ online_discount_percent: pct });
    if (on && pct > 0) setDiscountDrawer(true);
  };

  const handleLoyaltyToggle = async (on: boolean) => {
    setLoyaltyEnabled(on);
    await saveSettings({ loyalty_enabled: on });
    if (on) setLoyaltyDrawer(true);
  };

  const handleNoShowToggle = async (on: boolean) => {
    setShowForfeit(on);
    await saveSettings({ show_cancellation_forfeit: on });
    if (on) setNoShowDrawer(true);
  };

  const handleSummaryToggle = async (on: boolean) => {
    setSummaryEnabled(on);
    await saveSettings({ owner_summary_enabled: on });
  };

  // Save handlers
  const saveDiscount = async () => {
    const pct = Math.max(1, Math.min(50, discountPercent));
    await saveSettings({ online_discount_percent: pct });
    setDiscountDrawer(false);
  };

  const saveLoyalty = async () => {
    const clampedStamps = Math.max(2, Math.min(50, stampsRequired));
    const duration = durationMonths === "none" ? null : parseInt(durationMonths);
    await saveSettings({
      loyalty_enabled: loyaltyEnabled,
      loyalty_stamps_required: clampedStamps,
      loyalty_duration_months: duration,
      loyalty_reward_type: rewardType,
      loyalty_reward_percent: rewardType === "free_service" ? 100 : Math.max(1, Math.min(100, rewardPercent)),
      loyalty_eligible_staff: selectedStaffIds.length === staffList.length ? [] : selectedStaffIds,
    });
    setLoyaltyDrawer(false);
  };

  const saveNoShow = async () => {
    await saveSettings({
      show_cancellation_forfeit: showForfeit,
      cancellation_forfeit_hours: forfeitHours,
      no_show_forfeit_percent: Math.max(0, Math.min(100, noShowPercent)),
    });
    setNoShowDrawer(false);
  };

  const saveSummary = async () => {
    const digits = altPhone.replace(/\D/g, "");
    await saveSettings({
      owner_summary_enabled: summaryEnabled,
      owner_summary_phone: digits || null,
    });
    setSummaryDrawer(false);
  };

  if (tenantLoading) {
    return (
      <div className="space-y-6 px-4 md:px-0">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) return <NoTenantState />;

  const discountOn = discountPercent > 0;
  const discountCents = Math.round(examplePrice * discountPercent / 100);
  const noShowRetention = Math.round(examplePrice * noShowPercent / 100);
  const noShowRefund = examplePrice - noShowRetention;
  const barbershopPhone = currentTenant?.phone || "";
  const altDigits = altPhone.replace(/\D/g, "");
  const destinationPhone = altDigits || barbershopPhone;

  const allStaffSelected = selectedStaffIds.length === 0;
  const eligibleStaffCount = allStaffSelected ? staffList.length : selectedStaffIds.length;

  return (
    <div className="space-y-6 px-4 md:px-0">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Alta Performance</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Ferramentas inteligentes para faturar mais, fidelizar clientes e reduzir cancelamentos.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Card 1 — Desconto Inteligente */}
        <Card className={`transition-all ${discountOn ? 'border-emerald-500/30' : ''}`}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Desconto Inteligente</h3>
                </div>
              </div>
              <Switch checked={discountOn} onCheckedChange={handleDiscountToggle} />
            </div>

            {discountOn ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Clientes que pagam online ganham desconto. Mais pré-pagamentos = menos faltas.
                </p>
                <div className="text-sm">
                  <span className="text-muted-foreground">Seu desconto atual: </span>
                  <span className="font-semibold text-foreground">{discountPercent}%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clientes economizam {formatBRL(discountCents)} em um serviço de {formatBRL(examplePrice)}
                </p>
                <Button variant="ghost" size="sm" className="text-primary p-0 h-auto" onClick={() => setDiscountDrawer(true)}>
                  Configurar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Clientes que pagam online ganham desconto. Mais pré-pagamentos = menos faltas.
                </p>
                <Button variant="ghost" size="sm" className="text-primary p-0 h-auto" onClick={() => handleDiscountToggle(true)}>
                  Ativar agora <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 2 — Cartão Fidelidade */}
        <Card className={`transition-all ${loyaltyEnabled ? 'border-emerald-500/30' : ''}`}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Cartão Fidelidade</h3>
                </div>
              </div>
              <Switch checked={loyaltyEnabled} onCheckedChange={handleLoyaltyToggle} />
            </div>

            {loyaltyEnabled ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {stampsRequired} selos → {rewardType === "free_service" ? "Serviço grátis" : `${rewardPercent}% de desconto`}
                  {durationMonths !== "none" ? ` · Validade: ${durationMonths} meses` : " · Sem prazo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {eligibleStaffCount} profissional(is) participante(s) · {loyaltyActiveCards} cartão(ões) ativo(s)
                </p>
                {/* Stamp preview */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(stampsRequired, 10) }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-sm ${i < Math.min(5, stampsRequired) ? 'bg-amber-500' : 'bg-muted'}`}
                    />
                  ))}
                  {stampsRequired > 10 && <span className="text-xs text-muted-foreground ml-1">+{stampsRequired - 10}</span>}
                </div>
                <Button variant="ghost" size="sm" className="text-primary p-0 h-auto" onClick={() => setLoyaltyDrawer(true)}>
                  Configurar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Clientes ganham selos a cada agendamento. Ao completar o cartão, ganham recompensa. Simples e eficiente.
                </p>
                <Button variant="ghost" size="sm" className="text-primary p-0 h-auto" onClick={() => handleLoyaltyToggle(true)}>
                  Ativar agora <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 3 — Proteção Anti-Falta */}
        <Card className={`transition-all ${showForfeit ? 'border-emerald-500/30' : ''}`}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Proteção Anti-Falta</h3>
                </div>
              </div>
              <Switch checked={showForfeit} onCheckedChange={handleNoShowToggle} />
            </div>

            {showForfeit ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Quando o cliente não aparece, você decide quanto retém. Justo para ele, seguro para você.
                </p>
                <div className="text-sm space-y-0.5">
                  <p><span className="text-muted-foreground">Retenção atual:</span> <span className="font-semibold">{noShowPercent}%</span></p>
                  <p className="text-xs text-muted-foreground">
                    Em um serviço de {formatBRL(examplePrice)}: você retém {formatBRL(noShowRetention)}, cliente recebe {formatBRL(noShowRefund)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="text-primary p-0 h-auto" onClick={() => setNoShowDrawer(true)}>
                  Configurar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Quando o cliente não aparece, você decide quanto retém. Justo para ele, seguro para você.
                </p>
                <Button variant="ghost" size="sm" className="text-primary p-0 h-auto" onClick={() => handleNoShowToggle(true)}>
                  Ativar agora <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 4 — Resumo Semanal */}
        <Card className={`transition-all ${summaryEnabled ? 'border-emerald-500/30' : ''}`}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Resumo Semanal</h3>
                </div>
              </div>
              <Switch checked={summaryEnabled} onCheckedChange={handleSummaryToggle} />
            </div>

            {summaryEnabled ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Todo sábado às 20h, você recebe um resumo da semana no WhatsApp com atendimentos, faturamento e performance.
                </p>
                {destinationPhone && (
                  <p className="text-xs text-muted-foreground">
                    Enviado para: {formatPhone(destinationPhone)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Próximo envio: {getNextSaturday()}
                </p>
                <Button variant="ghost" size="sm" className="text-primary p-0 h-auto" onClick={() => setSummaryDrawer(true)}>
                  Configurar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Todo sábado às 20h, receba um resumo da semana no WhatsApp com faturamento e performance da equipe.
                </p>
                <Button variant="ghost" size="sm" className="text-primary p-0 h-auto" onClick={() => handleSummaryToggle(true)}>
                  Ativar agora <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== DRAWERS ===== */}

      {/* Discount Drawer */}
      <Drawer open={discountDrawer} onOpenChange={setDiscountDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Desconto Inteligente</DrawerTitle>
            <DrawerDescription>
              Ofereça desconto para quem paga online. Quanto mais clientes pagam antes, menos faltas você tem.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-6">
            <div>
              <Label>Desconto</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number" min={1} max={50}
                  value={discountPercent || 10}
                  onChange={(e) => setDiscountPercent(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Como o cliente vê:</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground line-through">{formatBRL(examplePrice)}</span>
                <span className="text-lg font-bold text-emerald-500">{formatBRL(examplePrice - Math.round(examplePrice * (discountPercent || 10) / 100))}</span>
              </div>
              <p className="text-xs text-emerald-500">Economize {formatBRL(Math.round(examplePrice * (discountPercent || 10) / 100))}</p>
            </div>

            <Button onClick={saveDiscount} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Loyalty Drawer */}
      <Drawer open={loyaltyDrawer} onOpenChange={setLoyaltyDrawer}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Cartão Fidelidade</DrawerTitle>
            <DrawerDescription>
              Clientes acumulam selos a cada atendimento e ganham recompensa ao completar o cartão.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-5 overflow-y-auto">
            <div>
              <Label>Selos para completar</Label>
              <Input
                type="number" min={2} max={50}
                value={stampsRequired}
                onChange={(e) => setStampsRequired(parseInt(e.target.value) || 10)}
                className="w-24 mt-1"
              />
            </div>

            <div className="space-y-2">
              <Label>Validade do cartão</Label>
              <RadioGroup value={durationMonths} onValueChange={setDurationMonths} className="grid grid-cols-2 gap-2">
                {[{ value: "3", label: "3 meses" }, { value: "6", label: "6 meses" }, { value: "12", label: "12 meses" }, { value: "none", label: "Sem prazo" }].map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={`hp-dur-${opt.value}`} />
                    <Label htmlFor={`hp-dur-${opt.value}`} className="cursor-pointer text-sm">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Recompensa</Label>
              <RadioGroup value={rewardType} onValueChange={setRewardType} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="free_service" id="hp-rw-free" />
                  <Label htmlFor="hp-rw-free" className="cursor-pointer text-sm">Próximo serviço grátis</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="discount" id="hp-rw-disc" />
                  <Label htmlFor="hp-rw-disc" className="cursor-pointer text-sm">Desconto no próximo</Label>
                </div>
              </RadioGroup>
              {rewardType === "discount" && (
                <div className="flex items-center gap-2 ml-6">
                  <Input type="number" min={1} max={100} value={rewardPercent} onChange={(e) => setRewardPercent(parseInt(e.target.value) || 50)} className="w-20" />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Profissionais participantes</Label>
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hp-staff-all"
                    checked={allStaffSelected}
                    onCheckedChange={(checked) => setSelectedStaffIds(checked ? [] : staffList.map(s => s.id))}
                  />
                  <Label htmlFor="hp-staff-all" className="cursor-pointer text-sm font-medium">Todos</Label>
                </div>
                {staffList.map((staff) => (
                  <div key={staff.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`hp-staff-${staff.id}`}
                      checked={allStaffSelected || selectedStaffIds.includes(staff.id)}
                      onCheckedChange={(checked) => {
                        if (allStaffSelected) {
                          setSelectedStaffIds(checked ? [] : staffList.filter(s => s.id !== staff.id).map(s => s.id));
                        } else {
                          const newIds = checked
                            ? [...selectedStaffIds, staff.id]
                            : selectedStaffIds.filter(id => id !== staff.id);
                          setSelectedStaffIds(newIds.length === staffList.length ? [] : newIds);
                        }
                      }}
                    />
                    <Label htmlFor={`hp-staff-${staff.id}`} className="cursor-pointer text-sm">{staff.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Regras automáticas
              </div>
              <p className="text-xs text-muted-foreground">• Só conta agendamentos feitos pelo cliente (site/link)</p>
              <p className="text-xs text-muted-foreground">• Clientes com assinatura ou pacote ativo não participam</p>
              <p className="text-xs text-muted-foreground">• O selo é adicionado automaticamente ao concluir</p>
            </div>

            <Button onClick={saveLoyalty} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* No-Show Drawer */}
      <Drawer open={noShowDrawer} onOpenChange={setNoShowDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Proteção Anti-Falta</DrawerTitle>
            <DrawerDescription>
              Quando um cliente paga online e não comparece, qual percentual do valor você retém?
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-6">
            <div>
              <Label>Retenção</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number" min={0} max={100}
                  value={noShowPercent}
                  onChange={(e) => setNoShowPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">0% = reembolso total · 100% = sem reembolso</p>
            </div>

            <Separator />

            <div>
              <Label>Prazo para cancelamento sem penalidade</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number" min={1} max={72}
                  value={forfeitHours}
                  onChange={(e) => setForfeitHours(Math.max(1, parseInt(e.target.value) || 24))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">horas antes</span>
              </div>
            </div>

            <div className="rounded-xl border p-4 text-sm space-y-1">
              <p className="font-medium">Simulação (serviço de {formatBRL(examplePrice)})</p>
              <p className="text-destructive">Você retém: {formatBRL(noShowRetention)}</p>
              <p className="text-emerald-500">Cliente recebe: {formatBRL(noShowRefund)}</p>
            </div>

            <p className="text-xs text-muted-foreground">
              30% é o padrão do mercado. Valores entre 20-40% são os mais aceitos. Na hora do no-show, você pode ajustar caso a caso.
            </p>

            <Button onClick={saveNoShow} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Summary Drawer */}
      <Drawer open={summaryDrawer} onOpenChange={setSummaryDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Resumo Semanal</DrawerTitle>
            <DrawerDescription>
              Todo sábado às 20h, receba um resumo da semana com atendimentos, faturamento e performance.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <Label className="text-base font-medium">Receber resumo semanal</Label>
              <Switch checked={summaryEnabled} onCheckedChange={setSummaryEnabled} />
            </div>

            {summaryEnabled && (
              <>
                <p className="text-sm text-muted-foreground">
                  Enviado para: <span className="font-medium text-foreground">{destinationPhone ? formatPhone(destinationPhone) : "Nenhum número cadastrado"}</span>
                </p>

                {!showAltField ? (
                  <button type="button" className="text-sm text-primary hover:underline" onClick={() => setShowAltField(true)}>
                    Receber em outro número?
                  </button>
                ) : (
                  <div className="space-y-3 rounded-lg border p-4">
                    <Label className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Número alternativo
                    </Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={altPhone}
                      onChange={(e) => setAltPhone(formatPhoneMask(e.target.value))}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground">Deixe vazio para usar o número da barbearia.</p>
                  </div>
                )}
              </>
            )}

            <Button onClick={saveSummary} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
