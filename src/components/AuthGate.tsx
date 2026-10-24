import React from "react";
import { useAuth } from "@/context/AuthContext";
import { RepositoryProvider } from "@/context/RepositoryContext";
import { LoginPage } from "@/components/LoginPage";
import { WorkoutBackend } from "@/utils/remoteWorkoutRepository";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AuthGateProps {
  children: React.ReactNode;
  createBackend?: (uid: string) => WorkoutBackend;
}

/** Toont de app alleen aan ingelogde gebruikers, met hun eigen database-verbinding. */
export function AuthGate({ children, createBackend }: AuthGateProps) {
  const { status, errorMessage } = useAuth();
  if (status === "loading") return <p className="p-6 text-sm text-muted-foreground">Laden…</p>;
  if (status === "error") {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Alert variant="destructive">
          <AlertTitle>Inloggen is niet beschikbaar</AlertTitle>
          <AlertDescription>{errorMessage ?? "Onbekende fout."}</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (status === "signedOut") return <LoginPage />;
  return <RepositoryProvider createBackend={createBackend}>{children}</RepositoryProvider>;
}
