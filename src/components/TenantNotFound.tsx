import { SearchX, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface TenantNotFoundProps {
  slug?: string;
}

export function TenantNotFound({ slug }: TenantNotFoundProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <SearchX className="h-10 w-10 text-amber-400" />
        </div>

        <h1 className="text-2xl font-semibold mb-2">Estabelecimento não encontrado</h1>
        <p className="text-zinc-400 mb-2">
          Não encontramos nenhum estabelecimento com o endereço informado.
        </p>
        {slug && (
          <p className="text-zinc-600 text-sm mb-8 font-mono">/{slug}</p>
        )}

        <Button asChild className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl font-medium">
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Ir para a página inicial
          </Link>
        </Button>
      </div>
    </div>
  );
}
