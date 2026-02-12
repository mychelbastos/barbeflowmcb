import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-2">Página não encontrada</h2>
        <p className="text-zinc-400 mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>

        <div className="space-y-3">
          <Button asChild className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl font-medium">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Ir para a página inicial
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="w-full h-12 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à página anterior
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
