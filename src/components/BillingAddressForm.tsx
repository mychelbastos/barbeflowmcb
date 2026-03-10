import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface BillingAddress {
  zip_code: string;
  street_name: string;
  street_number: string;
  neighborhood: string;
  city: string;
  federal_unit: string;
}

interface BillingAddressFormProps {
  value: BillingAddress;
  onChange: (address: BillingAddress) => void;
}

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function BillingAddressForm({ value, onChange }: BillingAddressFormProps) {
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState(false);
  const numberInputRef = useRef<HTMLInputElement>(null);

  const formatCep = (raw: string): string => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return digits.slice(0, 5) + "-" + digits.slice(5);
    return digits;
  };

  const update = (partial: Partial<BillingAddress>) =>
    onChange({ ...value, ...partial });

  const fetchCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    setCepError(false);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError(true);
      } else {
        update({
          zip_code: digits,
          street_name: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          federal_unit: data.uf || "",
        });
        setTimeout(() => numberInputRef.current?.focus(), 100);
      }
    } catch {
      setCepError(true);
    } finally {
      setCepLoading(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <MapPin className="h-3.5 w-3.5" />
        Endereço de cobrança
      </div>

      {/* CEP + Número */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">CEP *</Label>
          <div className="relative">
            <Input
              placeholder="00000-000"
              value={formatCep(value.zip_code)}
              onChange={(e) => {
                setCepError(false);
                const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                update({ zip_code: digits });
                if (digits.length === 8) {
                  fetchCep(digits);
                }
              }}
              onBlur={() => fetchCep(value.zip_code)}
              inputMode="numeric"
              maxLength={9}
            />
            {cepLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {cepError && (
            <p className="text-[11px] text-destructive">CEP não encontrado</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Número *</Label>
          <Input
            ref={numberInputRef}
            placeholder="123"
            value={value.street_number}
            onChange={(e) => update({ street_number: e.target.value })}
          />
        </div>
      </div>

      {/* Rua */}
      <div className="space-y-1.5">
        <Label className="text-xs">Rua *</Label>
        <Input
          placeholder="Rua / Avenida"
          value={value.street_name}
          onChange={(e) => update({ street_name: e.target.value })}
        />
      </div>

      {/* Bairro + Cidade + UF */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Bairro *</Label>
          <Input
            placeholder="Bairro"
            value={value.neighborhood}
            onChange={(e) => update({ neighborhood: e.target.value })}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Cidade *</Label>
          <Input
            placeholder="Cidade"
            value={value.city}
            onChange={(e) => update({ city: e.target.value })}
          />
        </div>
        <div className="col-span-1 space-y-1.5">
          <Label className="text-xs">UF *</Label>
          <Select
            value={value.federal_unit}
            onValueChange={(v) => update({ federal_unit: v })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              {UF_LIST.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function isBillingAddressComplete(addr: BillingAddress): boolean {
  return (
    addr.zip_code.replace(/\D/g, "").length === 8 &&
    addr.street_name.trim().length > 0 &&
    addr.street_number.trim().length > 0 &&
    addr.neighborhood.trim().length > 0 &&
    addr.city.trim().length > 0 &&
    addr.federal_unit.length === 2
  );
}
