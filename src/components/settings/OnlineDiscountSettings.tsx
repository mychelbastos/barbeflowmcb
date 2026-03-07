import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface OnlineDiscountValues {
  online_discount_percent: number;
  show_cancellation_forfeit: boolean;
  cancellation_forfeit_hours: number;
}

interface Props {
  currentTenant: any;
  onChange: (values: OnlineDiscountValues) => void;
}

export function OnlineDiscountSettings({ currentTenant, onChange }: Props) {
  const settings = currentTenant?.settings || {};

  const [discountPercent, setDiscountPercent] = useState<number>(settings.online_discount_percent ?? 0);
  const [showForfeit, setShowForfeit] = useState<boolean>(settings.show_cancellation_forfeit ?? false);
  const [forfeitHours, setForfeitHours] = useState<number>(settings.cancellation_forfeit_hours ?? 24);

  useEffect(() => {
    const s = currentTenant?.settings || {};
    setDiscountPercent(s.online_discount_percent ?? 0);
    setShowForfeit(s.show_cancellation_forfeit ?? false);
    setForfeitHours(s.cancellation_forfeit_hours ?? 24);
  }, [currentTenant]);

  // Notify parent whenever values change
  useEffect(() => {
    onChange({
      online_discount_percent: Math.max(0, Math.min(50, discountPercent)),
      show_cancellation_forfeit: showForfeit,
      cancellation_forfeit_hours: forfeitHours,
    });
  }, [discountPercent, showForfeit, forfeitHours]);

  const examplePrice = 4000;
  const exampleDiscount = Math.round(examplePrice * discountPercent / 100);
  const exampleOnline = examplePrice - exampleDiscount;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <Label>Percentual de desconto</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              min={0}
              max={50}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            0 = sem desconto, máximo 50%
          </p>
        </div>

        {discountPercent > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <p className="font-medium">Exemplo: Serviço de R$ 40,00</p>
            <p className="text-emerald-600">→ Online: R$ {(exampleOnline / 100).toFixed(2)} ({discountPercent}% off)</p>
            <p className="text-muted-foreground">→ No local: R$ {(examplePrice / 100).toFixed(2)}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Exibir aviso de política no checkout</Label>
            <p className="text-xs text-muted-foreground">
              Informa ao cliente que cancelamentos tardios não são reembolsados
            </p>
          </div>
          <Switch checked={showForfeit} onCheckedChange={setShowForfeit} />
        </div>

        {showForfeit && (
          <>
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

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
              <strong>⚠️ Preview:</strong> Ao confirmar, caso não compareça ou cancele com menos de {forfeitHours}h de antecedência, o valor pago não será reembolsado.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
