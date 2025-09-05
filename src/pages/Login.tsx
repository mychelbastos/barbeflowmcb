import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Scissors, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Attempting login...');
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      console.log('Login result:', { error });

      if (error) {
        console.error('Login failed:', error);
      } else {
        console.log('Login successful - AuthWatcher will handle redirect');
      }
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao início
          </Link>
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Scissors className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">BarberSync</h1>
          <p className="text-muted-foreground">Entre na sua conta</p>
        </div>

        <Card className="border-border shadow-large">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">
              {isSignUp ? "Criar conta" : "Fazer login"}
            </CardTitle>
            <CardDescription className="text-center">
              {isSignUp 
                ? "Crie sua conta para gerenciar sua barbearia" 
                : "Entre com seus dados para acessar o painel"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="flex items-center justify-between">
                <Link
                  to="/app/forgot-password"
                  className="text-sm text-primary hover:text-primary-hover transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading 
                  ? (isSignUp ? "Criando conta..." : "Entrando...") 
                  : (isSignUp ? "Criar conta" : "Entrar")
                }
              </Button>
            </form>

            <div className="mt-6">
              <Separator className="mb-6" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {isSignUp ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:text-primary-hover font-medium transition-colors"
                  >
                    {isSignUp ? "Fazer login" : "Criar conta"}
                  </button>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Access */}
        <Card className="mt-6 border-accent/20 bg-accent/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Quer testar antes? Acesse a demonstração:
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.location.href = '/booking/barbearia-premium'}
              >
                Ver Demo da Barbearia
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;