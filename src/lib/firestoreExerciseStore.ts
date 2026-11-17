/** Eigen oefeningen in Firestore: `users/{uid}/exercises/{exerciseId}`. Geen logica; die staat in `customExercises.ts`. */
import { Firestore, collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import type { ExerciseStore } from "@/context/ExerciseCatalogContext";

export function createFirestoreExerciseStore(db: Firestore, uid: string): ExerciseStore {
  return {
    listen(onData, onError) {
      return onSnapshot(
        collection(db, "users", uid, "exercises"),
        (snap) => onData(snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }))),
        onError
      );
    },
    put(exercise) {
      const { id, name, muscleGroup, pplCategory, equipment, createdAt, kind } = exercise;
      const isCardio = kind === "cardio";
      return setDoc(doc(db, "users", uid, "exercises", id), {
        id,
        name,
        ...(kind ? { kind } : {}),
        ...(isCardio ? {} : { muscleGroup, pplCategory }),
        ...(equipment ? { equipment } : {}),
        createdAt,
      });
    },
    remove(id) {
      return deleteDoc(doc(db, "users", uid, "exercises", id));
    },
  };
}
