import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, Package, GripVertical } from "lucide-react";

interface OrderBump {
  id: string;
  product_id: string;
  product_name: string;
  product_price_cents: number;
  product_photo_url: string | null;
  sort_order: number;
  active: boolean;
}

interface Props {
  tenantId: string;
  serviceId: string;
}

export function OrderBumpConfig({ tenantId, serviceId }: Props) {
  const [bumps, setBumps] = useState<OrderBump[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [serviceId]);

  const loadData = async () => {
    setLoading(true);
    const [bumpsRes, productsRes] = await Promise.all([
      supabase
        .from("service_order_bumps")
        .select("id, product_id, sort_order, active")
        .eq("service_id", serviceId)
        .eq("tenant_id", tenantId)
        .order("sort_order"),
      supabase
        .from("products")
        .select("id, name, sale_price_cents, photo_url")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("name"),
    ]);

    const bumpRows = bumpsRes.data || [];
    const prods = productsRes.data || [];
    setProducts(prods);

    // Merge product info into bumps
    const merged: OrderBump[] = bumpRows.map((b: any) => {
      const p = prods.find((pr: any) => pr.id === b.product_id);
      return {
        id: b.id,
        product_id: b.product_id,
        product_name: p?.name || "Produto removido",
        product_price_cents: p?.sale_price_cents || 0,
        product_photo_url: p?.photo_url || null,
        sort_order: b.sort_order,
        active: b.active,
      };
    });
    setBumps(merged);
    setLoading(false);
  };

  const addBump = async (product: any) => {
    setSearchOpen(false);
    if (bumps.some((b) => b.product_id === product.id)) return;

    const { data, error } = await supabase
      .from("service_order_bumps")
      .insert({
        tenant_id: tenantId,
        service_id: serviceId,
        product_id: product.id,
        sort_order: bumps.length,
        active: true,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error adding order bump:", error);
      return;
    }

    setBumps((prev) => [
      ...prev,
      {
        id: data.id,
        product_id: product.id,
        product_name: product.name,
        product_price_cents: product.sale_price_cents,
        product_photo_url: product.photo_url,
        sort_order: bumps.length,
        active: true,
      },
    ]);
  };

  const removeBump = async (bumpId: string) => {
    await supabase.from("service_order_bumps").delete().eq("id", bumpId);
    setBumps((prev) => prev.filter((b) => b.id !== bumpId));
  };

  const toggleBump = async (bumpId: string, active: boolean) => {
    await supabase.from("service_order_bumps").update({ active }).eq("id", bumpId);
    setBumps((prev) => prev.map((b) => (b.id === bumpId ? { ...b, active } : b)));
  };

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;

  const availableProducts = products.filter(
    (p) => !bumps.some((b) => b.product_id === p.id)
  );

  if (loading) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" /> Order Bump (produtos sugeridos)
        </Label>
        {availableProducts.length > 0 && (
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <Command>
                <CommandInput placeholder="Buscar produto..." />
                <CommandList>
                  <CommandEmpty>Nenhum produto encontrado</CommandEmpty>
                  <CommandGroup heading="Produtos disponíveis">
                    {availableProducts.map((p) => (
                      <CommandItem
                        key={p.id}
                        onSelect={() => addBump(p)}
                        className="cursor-pointer"
                      >
                        <Package className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {fmt(p.sale_price_cents)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {bumps.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum produto configurado. Adicione produtos para sugerir aos clientes durante o agendamento.
        </p>
      ) : (
        <div className="space-y-2">
          {bumps.map((bump) => (
            <div
              key={bump.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border"
            >
              {bump.product_photo_url ? (
                <img
                  src={bump.product_photo_url}
                  alt={bump.product_name}
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium truncate block">
                  {bump.product_name}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {fmt(bump.product_price_cents)}
                </span>
              </div>
              <Switch
                checked={bump.active}
                onCheckedChange={(v) => toggleBump(bump.id, v)}
                className="scale-75"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => removeBump(bump.id)}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
