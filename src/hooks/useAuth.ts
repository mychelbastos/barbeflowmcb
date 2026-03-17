// Re-export from centralized AuthProvider — all consumers use this hook
import { useAuthContext } from "@/providers/AuthProvider";

export interface AuthState {
  user: ReturnType<typeof useAuthContext>['user'];
  session: ReturnType<typeof useAuthContext>['session'];
  loading: boolean;
}

export const useAuth = useAuthContext;
