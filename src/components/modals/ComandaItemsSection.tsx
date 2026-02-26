import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Package, Scissors, Users, ShoppingBag, Percent, Gift, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BookingItem {
  id: string;
  type: string;
  ref_id: string | null;
  title: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  discount_cents: number;
  staff_id: string | null;
  staff_name?: string;
  paid_status: string;
  paid_at: string | null;
  payment_id: string | null;
  receipt_id: string | null;
  purchase_price_cents: number;
}

const PAID_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  unpaid: { label: "Em aberto", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  paid_online: { label: "Pago online", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  paid_local: { label: "Pago no caixa", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  covered: { label: "Coberto", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  courtesy: { label: "Cortesia", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
};

interface Props {
  bookingId: string;
  tenantId: string;
  items: BookingItem[];
  onItemsChange: () => void;
  comandaClosed: boolean;
}

export function ComandaItemsSection({ bookingId, tenantId, items, onItemsChange, comandaClosed }: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [discountItemId, setDiscountItemId] = useState<string | null>(null);
  const [discountMode, setDiscountMode] = useState<"value" | "percent">("value");
  const [discountInput, setDiscountInput] = useState("");
  const [bulkDiscountOpen, setBulkDiscountOpen] = useState(false);
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState("");

  useEffect(() => {
    const load = async () => {
      const [prodRes, svcRes, staffRes] = await Promise.all([
        supabase.from("products").select("id, name, sale_price_cents, purchase_price_cents").eq("tenant_id", tenantId).eq("active", true).order("name"),
        supabase.from("services").select("id, name, price_cents").eq("tenant_id", tenantId).eq("active", true).order("name"),
        supabase.from("staff").select("id, name").eq("tenant_id", tenantId).eq("active", true).order("name"),
      ]);
      setProducts(prodRes.data || []);
      setServices(svcRes.data || []);
      setStaffList(staffRes.data || []);
    };
    load();
  }, [tenantId]);

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;
  const effectivePrice = (item: BookingItem) => item.total_price_cents - (item.discount_cents || 0);

  const addItem = async (type: "product" | "extra_service", item: any) => {
    const unitPrice = type === "product" ? item.sale_price_cents : item.price_cents;
    const { error } = await supabase.from("booking_items").insert({
      tenant_id: tenantId,
      booking_id: bookingId,
      type,
      ref_id: item.id,
      title: item.name,
      quantity: 1,
      unit_price_cents: unitPrice,
      purchase_price_cents: type === "product" ? (item.purchase_price_cents || 0) : 0,
      staff_id: null,
      paid_status: "unpaid",
    });
    if (error) {
      toast.error("Erro ao adicionar item");
      return;
    }
    toast.success(`${item.name} adicionado`);
    setSearchOpen(false);
    onItemsChange();
  };

  const removeItem = async (itemId: string) => {
    setDeletingId(itemId);
    const { error } = await supabase.from("booking_items").delete().eq("id", itemId);
    setDeletingId(null);
    if (error) {
      toast.error("Erro ao remover item");
      return;
    }
    toast.success("Item removido");
    onItemsChange();
  };

  const updateStaff = async (itemId: string, staffId: string) => {
    const { error } = await supabase.from("booking_items").update({ staff_id: staffId }).eq("id", itemId);
    if (error) {
      toast.error("Erro ao atualizar profissional");
      return;
    }
    onItemsChange();
  };

  const applyDiscount = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    let discountCents = 0;
    const val = parseFloat(discountInput || "0");

    if (discountMode === "percent") {
      const pct = Math.min(100, Math.max(0, val));
      discountCents = Math.round(item.total_price_cents * pct / 100);
    } else {
      discountCents = Math.round(val * 100);
    }

    discountCents = Math.min(discountCents, item.total_price_cents);
    discountCents = Math.max(0, discountCents);

    const { error } = await supabase.from("booking_items").update({ discount_cents: discountCents }).eq("id", itemId);
    if (error) {
      toast.error("Erro ao aplicar desconto");
      return;
    }
    toast.success(discountCents > 0 ? `Desconto de ${fmt(discountCents)} aplicado` : "Desconto removido");
    setDiscountItemId(null);
    setDiscountInput("");
    onItemsChange();
  };

  const applyBulkDiscount = async () => {
    const pct = Math.min(100, Math.max(0, parseFloat(bulkDiscountPercent || "0")));
    if (pct <= 0) return;

    const unpaidItems = items.filter(i => i.paid_status === "unpaid");
    const updates = unpaidItems.map(item => {
      const discountCents = Math.round(item.total_price_cents * pct / 100);
      return supabase.from("booking_items").update({ discount_cents: discountCents }).eq("id", item.id);
    });

    await Promise.all(updates);
    toast.success(`Desconto de ${pct}% aplicado em ${unpaidItems.length} item(ns)`);
    setBulkDiscountOpen(false);
    setBulkDiscountPercent("");
    onItemsChange();
  };

  const totalItems = items.reduce((sum, i) => sum + effectivePrice(i), 0);
  const totalDiscount = items.reduce((sum, i) => sum + (i.discount_cents || 0), 0);
  const totalPaid = items
    .filter(i => ["paid_online", "paid_local", "covered", "courtesy"].includes(i.paid_status))
    .reduce((sum, i) => sum + effectivePrice(i), 0);
  const totalCourtesy = items
    .filter(i => i.paid_status === "courtesy")
    .reduce((sum, i) => sum + effectivePrice(i), 0);
  const totalUnpaid = items
    .filter(i => i.paid_status === "unpaid")
    .reduce((sum, i) => sum + effectivePrice(i), 0);

  const hasUnpaidItems = items.some(i => i.paid_status === "unpaid");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" /> Itens da Comanda
        </h4>
        <div className="flex items-center gap-1.5">
          {!comandaClosed && (
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Buscar produto ou serviço..." />
                  <CommandList>
                    <CommandEmpty>Nenhum item encontrado</CommandEmpty>
                    {products.length > 0 && (
                      <CommandGroup heading="Produtos">
                        {products.map(p => (
                          <CommandItem key={`p-${p.id}`} onSelect={() => addItem("product", p)} className="cursor-pointer">
                            <Package className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            <span className="flex-1 truncate">{p.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{fmt(p.sale_price_cents)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {services.length > 0 && (
                      <CommandGroup heading="Serviços extras">
                        {services.map(s => (
                          <CommandItem key={`s-${s.id}`} onSelect={() => addItem("extra_service", s)} className="cursor-pointer">
                            <Scissors className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            <span className="flex-1 truncate">{s.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{fmt(s.price_cents)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {items.map((item) => {
          const statusCfg = PAID_STATUS_CONFIG[item.paid_status] || PAID_STATUS_CONFIG.unpaid;
          const isPaid = item.paid_status !== "unpaid";
          const canRemove = !isPaid && !comandaClosed && item.type !== "service";
          const canEditStaff = !isPaid && !comandaClosed;
          const canDiscount = !isPaid && !comandaClosed;
          const hasDiscount = (item.discount_cents || 0) > 0;
          const effPrice = effectivePrice(item);

          return (
            <div key={item.id} className="p-2.5 rounded-lg bg-muted/50 border border-border space-y-1.5">
              <div className="flex items-center gap-2">
                {item.type === "product" ? (
                  <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Scissors className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-xs font-medium flex-1 truncate">{item.title}</span>
                <span className="text-xs font-semibold text-foreground flex-shrink-0">
                  {hasDiscount ? (
                    <span className="flex items-center gap-1">
                      <span className="line-through text-muted-foreground font-normal">{fmt(item.total_price_cents)}</span>
                      <span>{fmt(effPrice)}</span>
                    </span>
                  ) : (
                    item.total_price_cents === 0 ? "Incluso" : fmt(item.total_price_cents)
                  )}
                </span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusCfg.className}`}>
                  {item.paid_status === "courtesy" && <Gift className="h-2.5 w-2.5 mr-0.5" />}
                  {statusCfg.label}
                </Badge>
                {canDiscount && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => {
                      if (discountItemId === item.id) {
                        setDiscountItemId(null);
                      } else {
                        setDiscountItemId(item.id);
                        setDiscountMode("value");
                        setDiscountInput(item.discount_cents > 0 ? (item.discount_cents / 100).toFixed(2) : "");
                      }
                    }}
                  >
                    <Tag className={`h-3 w-3 ${hasDiscount ? 'text-primary' : 'text-muted-foreground'}`} />
                  </Button>
                )}
                {canRemove && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover item?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {item.title} será removido da comanda.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeItem(item.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* Discount info */}
              {hasDiscount && isPaid && (
                <p className="text-[10px] text-muted-foreground pl-5">
                  Desconto: -{fmt(item.discount_cents)}
                </p>
              )}

              {/* Inline discount editor */}
              {discountItemId === item.id && (
                <div className="flex items-center gap-1.5 pl-5 pt-1">
                  <div className="flex items-center border border-border rounded-md overflow-hidden h-7">
                    <button
                      className={`px-2 h-full text-[10px] font-medium ${discountMode === "value" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      onClick={() => setDiscountMode("value")}
                    >
                      R$
                    </button>
                    <button
                      className={`px-2 h-full text-[10px] font-medium ${discountMode === "percent" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      onClick={() => setDiscountMode("percent")}
                    >
                      %
                    </button>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={discountMode === "percent" ? 100 : item.total_price_cents / 100}
                    step="0.01"
                    placeholder={discountMode === "percent" ? "Ex: 10" : "Ex: 5.00"}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="h-7 w-20 text-xs"
                  />
                  <Button size="sm" className="h-7 text-[10px] px-2" onClick={() => applyDiscount(item.id)}>
                    Aplicar
                  </Button>
                  {hasDiscount && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] px-2 text-red-500"
                      onClick={async () => {
                        await supabase.from("booking_items").update({ discount_cents: 0 }).eq("id", item.id);
                        setDiscountItemId(null);
                        toast.success("Desconto removido");
                        onItemsChange();
                      }}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              )}

              {/* Staff selector */}
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-muted-foreground" />
                {canEditStaff ? (
                  <Select value={item.staff_id || ""} onValueChange={(v) => updateStaff(item.id, v)}>
                    <SelectTrigger className="h-6 text-[11px] flex-1">
                      <SelectValue placeholder="Profissional..." />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    {item.staff_name || "—"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-1 text-xs">
        {totalDiscount > 0 && (
          <div className="flex justify-between text-primary">
            <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> Descontos</span>
            <span className="font-semibold">−{fmt(totalDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total efetivo</span>
          <span className="font-semibold">{fmt(totalItems)}</span>
        </div>
        {totalCourtesy > 0 && (
          <div className="flex justify-between text-purple-500">
            <span className="flex items-center gap-1"><Gift className="h-3 w-3" /> Cortesia</span>
            <span className="font-semibold">−{fmt(totalCourtesy)}</span>
          </div>
        )}
        {totalPaid > 0 && totalCourtesy < totalPaid && (
          <div className="flex justify-between text-emerald-500">
            <span>Já pago</span>
            <span className="font-semibold">−{fmt(totalPaid - totalCourtesy)}</span>
          </div>
        )}
        {totalUnpaid > 0 && (
          <div className="flex justify-between text-red-500 font-semibold">
            <span>Pendente</span>
            <span>{fmt(totalUnpaid)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
