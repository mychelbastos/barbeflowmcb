import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors, ArrowLeft, Mail, Lock, Sparkles } from "lucide-react";
import { getPublicUrl } from "@/lib/hostname";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

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
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />
      
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
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl mb-4">
            <Scissors className="h-7 w-7 text-zinc-950" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">BarberFlow</h1>
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
                ? "Crie sua conta para gerenciar sua barbearia" 
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
                  className="h-12 pl-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
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
                  className="h-12 pl-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {!isSignUp && (
              <div className="flex justify-end">
                <a
                  href="/app/forgot-password"
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Esqueci minha senha
                </a>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold"
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
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                {isSignUp ? "Fazer login" : "Criar conta"}
              </button>
            </p>
          </div>
        </motion.div>

        {/* Demo card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 bg-zinc-900/30 border border-zinc-800/30 rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-sm text-zinc-400">
              Quer testar antes?
            </p>
          </div>
          <Button 
            variant="ghost"
            size="sm" 
            className="w-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-100"
            onClick={() => window.location.href = '/booking/barbearia-premium'}
          >
            Ver Demo da Barbearia
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
