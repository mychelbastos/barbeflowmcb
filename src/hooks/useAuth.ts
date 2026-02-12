import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });
  const { toast } = useToast();
  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });

        // Only show welcome toast on explicit sign-in, not token refresh or session restore
        if (event === 'SIGNED_IN' && !sessionStorage.getItem('bf_welcomed')) {
          // Only show welcome toast on dashboard routes, not on public landing
          const isDashRoute = window.location.pathname.includes('/app') || window.location.pathname.includes('/dashboard');
          if (isDashRoute) {
            sessionStorage.setItem('bf_welcomed', '1');
            toast({
              title: "Bem-vindo!",
              description: "Login realizado com sucesso.",
            });
          }
        } else if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('bf_welcomed');
          toast({
            title: "Logout realizado",
            description: "Você foi desconectado com sucesso.",
          });
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Cadastro realizado!",
      description: "Verifique seu e-mail para confirmar a conta.",
    });

    return { error: null };
  };

  const signOut = async () => {
    // Use local scope to avoid invalidating sessions on other devices/tabs
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      // If session is already invalid, just clear state locally
      if (error.message?.includes('session_not_found') || error.status === 403) {
        setAuthState({ user: null, session: null, loading: false });
        return;
      }
      toast({
        title: "Erro no logout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
  };
};