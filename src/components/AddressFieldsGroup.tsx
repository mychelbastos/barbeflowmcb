import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";

interface AddressFields {
  address_cep: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
}

interface Props {
  values: AddressFields;
  onChange: (fields: Partial<AddressFields>) => void;
}

export function AddressFieldsGroup({ values, onChange }: Props) {
  const [cepLoading, setCepLoading] = useState(false);

  const formatCep = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return digits.slice(0, 5) + "-" + digits.slice(5);
    return digits;
  };

  const fetchCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        onChange({
          address_street: data.logradouro || "",
          address_neighborhood: data.bairro || "",
          address_city: data.localidade || "",
          address_state: data.uf || "",
        });
      }
    } catch {
      // silently fail
    } finally {
      setCepLoading(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <MapPin className="h-3.5 w-3.5" />
        Endereço
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">CEP</Label>
          <div className="relative">
            <Input
              placeholder="00000-000"
              value={values.address_cep}
              onChange={(e) => onChange({ address_cep: formatCep(e.target.value) })}
              onBlur={() => fetchCep(values.address_cep)}
              inputMode="numeric"
              maxLength={9}
            />
            {cepLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Número</Label>
          <Input
            placeholder="123"
            value={values.address_number}
            onChange={(e) => onChange({ address_number: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Rua</Label>
        <Input
          placeholder="Rua / Avenida"
          value={values.address_street}
          onChange={(e) => onChange({ address_street: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Complemento</Label>
          <Input
            placeholder="Apto, Bloco..."
            value={values.address_complement}
            onChange={(e) => onChange({ address_complement: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Bairro</Label>
          <Input
            placeholder="Bairro"
            value={values.address_neighborhood}
            onChange={(e) => onChange({ address_neighborhood: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Cidade</Label>
          <Input
            placeholder="Cidade"
            value={values.address_city}
            onChange={(e) => onChange({ address_city: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">UF</Label>
          <Input
            placeholder="BA"
            value={values.address_state}
            onChange={(e) => onChange({ address_state: e.target.value.toUpperCase().slice(0, 2) })}
            maxLength={2}
          />
        </div>
      </div>
    </div>
  );
}
