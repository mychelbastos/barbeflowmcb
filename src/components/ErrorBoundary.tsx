import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>

            <h1 className="text-2xl font-semibold mb-2">Algo deu errado</h1>
            <p className="text-muted-foreground mb-8">
              Ocorreu um erro inesperado. Tente recarregar a página ou voltar ao início.
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar página
              </Button>
              <Button
                variant="ghost"
                onClick={() => { window.location.href = "/"; }}
                className="w-full h-12 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
              >
                <Home className="h-4 w-4 mr-2" />
                Ir para o início
              </Button>
            </div>

            {this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-muted-foreground text-xs cursor-pointer hover:text-foreground">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 text-xs text-muted-foreground bg-muted rounded-lg p-3 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
