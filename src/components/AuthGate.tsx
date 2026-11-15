import React, { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { RepositoryProvider } from "@/context/RepositoryContext";
import { LoginPage } from "@/components/LoginPage";
import { ExerciseCatalogProvider, ExerciseStore } from "@/context/ExerciseCatalogContext";
import { getFirebaseDb } from "@/lib/firebase";
import { createFirestoreExerciseStore } from "@/lib/firestoreExerciseStore";
import { WorkoutBackend } from "@/utils/remoteWorkoutRepository";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AuthGateProps {
  children: React.ReactNode;
  createBackend?: (uid: string) => WorkoutBackend;
  createExerciseStore?: (uid: string) => ExerciseStore;
}

const defaultCreateExerciseStore = (uid: string) => createFirestoreExerciseStore(getFirebaseDb(), uid);

function Catalog({ create, children }: { create: (uid: string) => ExerciseStore; children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => create(uid), [uid]);
  return <ExerciseCatalogProvider store={store}>{children}</ExerciseCatalogProvider>;
}

/** Toont de app alleen aan ingelogde gebruikers, met hun eigen database-verbinding. */
export function AuthGate({ children, createBackend, createExerciseStore = defaultCreateExerciseStore }: AuthGateProps) {
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
  return (
    <RepositoryProvider createBackend={createBackend}>
      <Catalog create={createExerciseStore}>{children}</Catalog>
    </RepositoryProvider>
  );
}
