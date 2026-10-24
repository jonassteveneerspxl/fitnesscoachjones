import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { createFirestoreBackend } from "@/lib/firestoreBackend";
import {
  RemoteWorkoutRepository,
  WorkoutBackend,
  createRemoteWorkoutRepository,
} from "@/utils/remoteWorkoutRepository";

const RepositoryContext = createContext<RemoteWorkoutRepository | null>(null);

interface RepositoryProviderProps {
  children: React.ReactNode;
  /** Maakt de verbinding met de database voor deze gebruiker. Tests geven een nepverbinding mee. */
  createBackend?: (uid: string) => WorkoutBackend;
}

const defaultCreateBackend = (uid: string) => createFirestoreBackend(getFirebaseDb(), uid);

/**
 * Maakt voor de ingelogde gebruiker één repository (live verbonden met Firestore) en ruimt die op bij uitloggen
 * of van account wisselen. Moet binnen een `AuthProvider` staan.
 */
export function RepositoryProvider({ children, createBackend = defaultCreateBackend }: RepositoryProviderProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [repository, setRepository] = useState<RemoteWorkoutRepository | null>(null);

  useEffect(() => {
    if (!uid) {
      setRepository(null);
      return;
    }
    const repo = createRemoteWorkoutRepository({
      uid,
      backend: createBackend(uid),
      onWriteError: (message) => toast.error(message, { duration: 10000 }),
    });
    setRepository(repo);
    return () => {
      repo.dispose();
      setRepository(null);
    };
    // createBackend bewust niet als dependency: een nieuwe functie mag de verbinding niet opnieuw opzetten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  if (!repository) return <p className="p-6 text-sm text-muted-foreground">Laden…</p>;
  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>;
}

/** De repository van de ingelogde gebruiker, of `null` buiten een `RepositoryProvider`. */
export function useOptionalRepository(): RemoteWorkoutRepository | null {
  return useContext(RepositoryContext);
}
