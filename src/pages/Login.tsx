import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { getPublicUrl, isDashboardDomain } from "@/lib/hostname";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import logoBranca from "@/assets/modoGESTOR_branca.png";
import { trackEvent } from "@/utils/metaTracking";

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
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        console.error('Auth failed:', error);
      } else if (isSignUp) {
        // Track CompleteRegistration on successful signup
        trackEvent('CompleteRegistration', {
          content_name: 'Cadastro modoGESTOR',
          status: 'complete',
          value: 30.00,
          currency: 'BRL',
        }, {
          email,
        });
      }
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        {/* Back link */}
        <a 
          href={getPublicUrl('/')} 
          className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao início
        </a>

        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <img src={logoBranca} alt="modoGESTOR" className="h-10 mx-auto mb-4" />
          <p className="text-zinc-500 mt-1">
            {isSignUp ? "Crie sua conta" : "Entre na sua conta"}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-zinc-100">
              {isSignUp ? "Criar conta" : "Fazer login"}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {isSignUp 
                ? "Crie sua conta para gerenciar seu negócio" 
                : "Entre com seus dados para acessar o painel"
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-400 text-sm">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 pl-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-400 text-sm">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pl-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            </div>

            {!isSignUp && (
              <div className="flex justify-end">
                <a
                  href={`${isDashboardDomain() ? '' : '/app'}/forgot-password`}
                  className="text-sm text-primary hover:text-primary-hover transition-colors"
                >
                  Esqueci minha senha
                </a>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
            >
              {isLoading 
                ? (isSignUp ? "Criando conta..." : "Entrando...") 
                : (isSignUp ? "Criar conta" : "Entrar")
              }
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800/50">
            <p className="text-center text-sm text-zinc-500">
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
        </motion.div>

      </motion.div>
    </div>
  );
};

export default Login;