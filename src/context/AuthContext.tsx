import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthService, AuthUser } from "@/lib/authService";

export type AuthStatus = "loading" | "signedOut" | "signedIn" | "error";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  service: AuthService;
  /** Alleen gevuld bij `status === "error"`. */
  errorMessage?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  /** De inlogservice. Wordt in `App` aangemaakt met Firebase; tests geven een nepservice mee. */
  service: AuthService;
  children: React.ReactNode;
}

export function AuthProvider({ service, children }: AuthProviderProps) {
  const [state, setState] = useState<Pick<AuthContextValue, "status" | "user" | "errorMessage">>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    let active = true;
    try {
      const unsubscribe = service.onAuthStateChanged((user) => {
        if (!active) return;
        setState(user ? { status: "signedIn", user } : { status: "signedOut", user: null });
      });
      return () => {
        active = false;
        unsubscribe();
      };
    } catch (e) {
      setState({
        status: "error",
        user: null,
        errorMessage: e instanceof Error ? e.message : "Inloggen kon niet worden opgestart.",
      });
      return () => {
        active = false;
      };
    }
  }, [service]);

  const value = useMemo<AuthContextValue>(() => ({ ...state, service }), [state, service]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Voor onderdelen die altijd binnen een `AuthProvider` staan. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth moet binnen een AuthProvider gebruikt worden.");
  return ctx;
}

/** Voor onderdelen die ook zonder inloggen werken (bv. in tests): geeft `null` buiten een `AuthProvider`. */
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
