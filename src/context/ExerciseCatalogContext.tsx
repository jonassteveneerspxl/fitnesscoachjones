import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Exercise, exercises as builtIn } from "@/data/exercises";
import {
  CustomExercise,
  MAX_CUSTOM_EXERCISES,
  NewExerciseInput,
  mergeCatalog,
  parseCustomExercise,
  validateNewExercise,
} from "@/utils/customExercises";
import { generateId } from "@/utils/ids";

export interface ExerciseStore {
  listen(onData: (docs: { id: string; data: Record<string, unknown> }[]) => void, onError: (e: unknown) => void): () => void;
  /** Lokaal direct toegepast; het promise lost pas op na bevestiging door de server. */
  put(exercise: CustomExercise): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface AddResult {
  ok: boolean;
  message?: string;
  exercise?: CustomExercise;
}

export interface ExerciseCatalog {
  /** Ingebouwde + eigen oefeningen. */
  all: Exercise[];
  custom: CustomExercise[];
  /** `false` zonder opslag (bv. in tests): dan kan er niets worden toegevoegd. */
  canAdd: boolean;
  addExercise(input: NewExerciseInput): AddResult;
  removeExercise(id: string): void;
}

const staticCatalog: ExerciseCatalog = {
  all: builtIn,
  custom: [],
  canAdd: false,
  addExercise: () => ({ ok: false, message: "Eigen oefeningen zijn hier niet beschikbaar." }),
  removeExercise: () => undefined,
};

const Ctx = createContext<ExerciseCatalog>(staticCatalog);

const errorText = (e: unknown) => {
  const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
  return code === "permission-denied"
    ? "Geen toegang tot je eigen oefeningen. Publiceer de bijgewerkte Firestore-regels (zie docs/FIREBASE-INSTELLEN.md)."
    : "Synchroniseren van je eigen oefeningen is mislukt.";
};

export function ExerciseCatalogProvider({ store, children }: { store: ExerciseStore; children: React.ReactNode }) {
  const [custom, setCustom] = useState<CustomExercise[]>([]);
  const customRef = useRef<CustomExercise[]>([]);
  customRef.current = custom;
  const warned = useRef(false);

  useEffect(() => {
    return store.listen(
      (docs) => {
        const parsed = docs.map((d) => parseCustomExercise(d.id, d.data)).filter((x): x is CustomExercise => x !== null);
        setCustom(parsed);
      },
      (e) => {
        // Eén melding is genoeg; de ingebouwde lijst blijft gewoon werken.
        if (!warned.current) toast.error(errorText(e));
        warned.current = true;
      }
    );
  }, [store]);

  const all = useMemo(() => mergeCatalog(custom), [custom]);

  const addExercise = useCallback<ExerciseCatalog["addExercise"]>(
    (input) => {
      if (customRef.current.length >= MAX_CUSTOM_EXERCISES) {
        return { ok: false, message: `Je kunt maximaal ${MAX_CUSTOM_EXERCISES} eigen oefeningen hebben.` };
      }
      const result = validateNewExercise(input, mergeCatalog(customRef.current));
      if (!result.ok || !result.value) return { ok: false, message: result.message };
      const exercise: CustomExercise = { id: generateId(), createdAt: new Date().toISOString(), custom: true, ...result.value };
      // Niet wachten op de server: werkt ook zonder bereik. Een mislukking melden we achteraf.
      store.put(exercise).catch((e) => toast.error(errorText(e)));
      setCustom((prev) => [...prev, exercise]);
      return { ok: true, exercise };
    },
    [store]
  );

  const removeExercise = useCallback(
    (id: string) => {
      setCustom((prev) => prev.filter((c) => c.id !== id));
      store.remove(id).catch((e) => toast.error(errorText(e)));
    },
    [store]
  );

  const value = useMemo<ExerciseCatalog>(
    () => ({ all, custom, canAdd: true, addExercise, removeExercise }),
    [all, custom, addExercise, removeExercise]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExerciseCatalog(): ExerciseCatalog {
  return useContext(Ctx);
}
