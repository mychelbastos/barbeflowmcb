import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenant } from "@/hooks/useTenant";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { NewTenantModal } from "./modals/NewTenantModal";
import { Check, ChevronDown, Plus, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TenantSelector() {
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  const { tenants, currentTenant, setCurrentTenant } = useTenant();
  const { isSuperAdmin } = useSuperAdmin();

  // Não mostrar o seletor se não for super admin ou não tiver múltiplos tenants
  if (!isSuperAdmin || tenants.length <= 1) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-auto">
            <Building2 className="h-4 w-4" />
            <span className="font-medium">{currentTenant?.name || 'Selecionar'}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Barbearias
          </div>
          {tenants.map((tenant) => (
            <DropdownMenuItem
              key={tenant.id}
              onClick={() => setCurrentTenant(tenant)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium">{tenant.name}</span>
                <span className="text-xs text-muted-foreground">@{tenant.slug}</span>
              </div>
              {currentTenant?.id === tenant.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowNewTenantModal(true)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nova Barbearia
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewTenantModal
        open={showNewTenantModal}
        onOpenChange={setShowNewTenantModal}
      />
    </>
  );
}