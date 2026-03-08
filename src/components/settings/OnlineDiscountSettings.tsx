import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface OnlineDiscountValues {
  online_discount_percent: number;
  show_cancellation_forfeit: boolean;
  cancellation_forfeit_hours: number;
  no_show_forfeit_percent: number;
}

interface Props {
  currentTenant: any;
  onChange: (values: OnlineDiscountValues) => void;
}

export function OnlineDiscountSettings({ currentTenant, onChange }: Props) {
  const settings = currentTenant?.settings || {};

  const [enabled, setEnabled] = useState<boolean>((settings.online_discount_percent ?? 0) > 0);
  const [discountPercent, setDiscountPercent] = useState<number>(settings.online_discount_percent ?? 0);
  const [showForfeit, setShowForfeit] = useState<boolean>(settings.show_cancellation_forfeit ?? false);
  const [forfeitHours, setForfeitHours] = useState<number>(settings.cancellation_forfeit_hours ?? 24);
  const [noShowPercent, setNoShowPercent] = useState<number>(settings.no_show_forfeit_percent ?? 30);

  useEffect(() => {
    const s = currentTenant?.settings || {};
    const pct = s.online_discount_percent ?? 0;
    setEnabled(pct > 0);
    setDiscountPercent(pct);
    setShowForfeit(s.show_cancellation_forfeit ?? false);
    setForfeitHours(s.cancellation_forfeit_hours ?? 24);
    setNoShowPercent(s.no_show_forfeit_percent ?? 30);
  }, [currentTenant]);

  // Notify parent whenever values change
  useEffect(() => {
    onChange({
      online_discount_percent: enabled ? Math.max(1, Math.min(50, discountPercent)) : 0,
      show_cancellation_forfeit: showForfeit,
      cancellation_forfeit_hours: forfeitHours,
      no_show_forfeit_percent: Math.max(0, Math.min(100, noShowPercent)),
    });
  }, [enabled, discountPercent, showForfeit, forfeitHours, noShowPercent]);

  const effectivePercent = enabled ? Math.max(1, discountPercent) : 0;
  const examplePrice = 4000;
  const exampleDiscount = Math.round(examplePrice * effectivePercent / 100);
  const exampleOnline = examplePrice - exampleDiscount;

  const retentionCents = Math.round(examplePrice * noShowPercent / 100);
  const refundCents = examplePrice - retentionCents;

  return (
    <div className="space-y-4">
      <Separator className="my-2" />

      {/* Toggle principal */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base font-medium">Desconto Garantia de Comparecimento</Label>
          <p className="text-xs text-muted-foreground">
            Ofereça desconto para clientes que pagam antecipadamente e garantem presença
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => {
            setEnabled(v);
            if (v && discountPercent < 1) setDiscountPercent(10);
          }}
        />
      </div>

      {enabled && (
        <div className="rounded-lg border p-4 space-y-4">
          <div>
            <Label>Percentual de desconto</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min={1}
                max={50}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Máximo 50%
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <p className="font-medium">Exemplo: Serviço de R$ 40,00</p>
            <p className="text-emerald-600">→ Online: R$ {(exampleOnline / 100).toFixed(2)} ({effectivePercent}% off)</p>
            <p className="text-muted-foreground">→ No local: R$ {(examplePrice / 100).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Política de cancelamento */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base font-medium">Política de cancelamento no checkout</Label>
          <p className="text-xs text-muted-foreground">
            Informa ao cliente sobre retenção em caso de não comparecimento ou cancelamento tardio
          </p>
        </div>
        <Switch checked={showForfeit} onCheckedChange={setShowForfeit} />
      </div>

      {showForfeit && (
        <div className="rounded-lg border p-4 space-y-4">
          <div>
            <Label>Prazo mínimo para cancelamento (horas)</Label>
            <Input
              type="number"
              min={1}
              max={72}
              value={forfeitHours}
              onChange={(e) => setForfeitHours(Math.max(1, parseInt(e.target.value) || 24))}
              className="w-24 mt-1"
            />
          </div>

          <Separator />

          <div className="space-y-1">
            <Label>Percentual de retenção (No-Show)</Label>
            <p className="text-xs text-muted-foreground">
              Quando o cliente paga antecipadamente e não comparece, qual percentual será retido?
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              value={noShowPercent}
              onChange={(e) => setNoShowPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            0% = reembolso total · 100% = sem reembolso
          </p>

          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <p className="font-medium">Exemplo: Serviço de R$ 40,00 pago online</p>
            <p className="text-destructive">→ Retenção: R$ {(retentionCents / 100).toFixed(2)} ({noShowPercent}%)</p>
            <p className="text-emerald-600">→ Reembolso: R$ {(refundCents / 100).toFixed(2)} ({100 - noShowPercent}%)</p>
          </div>

          <div className="rounded-lg bg-muted/50 border p-3 text-sm text-muted-foreground">
            <strong>Preview no checkout:</strong>{' '}
            {noShowPercent >= 100
              ? `Ao confirmar, caso não compareça ou cancele com menos de ${forfeitHours}h de antecedência, o valor pago não será reembolsado.`
              : noShowPercent <= 0
              ? `Ao confirmar, caso não compareça ou cancele com menos de ${forfeitHours}h de antecedência, entre em contato para reagendar.`
              : `Ao confirmar, caso não compareça ou cancele com menos de ${forfeitHours}h de antecedência, ${noShowPercent}% do valor será retido e o restante reembolsado.`}
          </div>
        </div>
      )}
    </div>
  );
}
