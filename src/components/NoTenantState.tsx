import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function NoTenantState() {
  return (
    <Card className="max-w-md mx-auto mt-12">
      <CardContent className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum estabelecimento encontrado
        </h3>
        <p className="text-muted-foreground text-sm">
          Você ainda não está associado a nenhum estabelecimento. Entre em contato com o administrador para solicitar acesso.
        </p>
      </CardContent>
    </Card>
  );
}
