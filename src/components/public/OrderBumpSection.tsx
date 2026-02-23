import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Check } from "lucide-react";

export interface OrderBumpProduct {
  product_id: string;
  name: string;
  description: string | null;
  sale_price_cents: number;
  purchase_price_cents: number;
  photo_url: string | null;
}

interface Props {
  tenantId: string;
  serviceId: string;
  onSelectionChange: (selected: OrderBumpProduct[]) => void;
}

export function OrderBumpSection({ tenantId, serviceId, onSelectionChange }: Props) {
  const [products, setProducts] = useState<OrderBumpProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBumps();
  }, [serviceId]);

  const loadBumps = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    onSelectionChange([]);

    const { data, error } = await supabase
      .from("service_order_bumps")
      .select("product_id, sort_order")
      .eq("service_id", serviceId)
      .eq("active", true)
      .order("sort_order");

    if (error || !data || data.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const productIds = data.map((d: any) => d.product_id);
    const { data: prods } = await supabase
      .from("products")
      .select("id, name, description, sale_price_cents, purchase_price_cents, photo_url")
      .in("id", productIds)
      .eq("active", true);

    if (!prods) {
      setProducts([]);
      setLoading(false);
      return;
    }

    // Keep sort order from bumps
    const sorted: OrderBumpProduct[] = data
      .map((bump: any) => {
        const p = prods.find((pr: any) => pr.id === bump.product_id);
        if (!p) return null;
        return {
          product_id: p.id,
          name: p.name,
          description: p.description || null,
          sale_price_cents: p.sale_price_cents,
          purchase_price_cents: p.purchase_price_cents,
          photo_url: p.photo_url,
        };
      })
      .filter(Boolean) as OrderBumpProduct[];

    setProducts(sorted);
    setLoading(false);
  };

  const toggleProduct = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      const selected = products.filter((p) => next.has(p.product_id));
      onSelectionChange(selected);
      return next;
    });
  };

  if (loading || products.length === 0) return null;

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;
  const totalSelected = products
    .filter((p) => selectedIds.has(p.product_id))
    .reduce((sum, p) => sum + p.sale_price_cents, 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Package className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-medium">Aproveite e adicione</span>
      </div>

      <div className="space-y-2">
        {products.map((product) => (
          <button
            key={product.product_id}
            type="button"
            onClick={() => toggleProduct(product.product_id)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left ${
              selectedIds.has(product.product_id)
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              selectedIds.has(product.product_id)
                ? "bg-emerald-500 border-emerald-500"
                : "border-zinc-600"
            }`}>
              {selectedIds.has(product.product_id) && <Check className="h-3 w-3 text-white" />}
            </div>
            {product.photo_url ? (
              <img
                src={product.photo_url}
                alt={product.name}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-zinc-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{product.name}</p>
              {product.description && (
                <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{product.description}</p>
              )}
            </div>
            <span className="text-sm font-semibold text-emerald-400 whitespace-nowrap">
              + {fmt(product.sale_price_cents)}
            </span>
          </button>
        ))}
      </div>

      {totalSelected > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-sm">
          <span className="text-zinc-400">Produtos adicionais</span>
          <span className="font-semibold text-emerald-400">{fmt(totalSelected)}</span>
        </div>
      )}
    </div>
  );
}
