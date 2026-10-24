/**
 * `WorkoutBackend` op Firestore: documenten onder `users/{uid}/workouts/{workoutId}`.
 * Bevat bewust geen logica; alles wat te testen valt staat in `remoteWorkoutRepository.ts`.
 */
import { Firestore, collection, doc, onSnapshot, waitForPendingWrites, writeBatch } from "firebase/firestore";
import type { RemoteSnapshot, WorkoutBackend, WriteOp } from "@/utils/remoteWorkoutRepository";

/** Firestore staat maximaal 500 schrijfacties per batch toe. */
const MAX_BATCH = 400;

export function createFirestoreBackend(db: Firestore, uid: string): WorkoutBackend {
  const workouts = () => collection(db, "users", uid, "workouts");

  return {
    listen(onData, onError) {
      return onSnapshot(
        workouts(),
        (snap) => {
          const snapshot: RemoteSnapshot = {
            docs: snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> })),
            fromCache: snap.metadata.fromCache,
            hasPendingWrites: snap.metadata.hasPendingWrites,
          };
          onData(snapshot);
        },
        onError
      );
    },

    write(ops: WriteOp[]) {
      // `commit()` past de wijziging direct lokaal toe; het promise lost pas op na bevestiging door de server.
      const commits: Promise<void>[] = [];
      for (let i = 0; i < ops.length; i += MAX_BATCH) {
        const batch = writeBatch(db);
        for (const op of ops.slice(i, i + MAX_BATCH)) batch.set(doc(db, "users", uid, "workouts", op.id), op.data);
        commits.push(batch.commit());
      }
      return Promise.all(commits).then(() => undefined);
    },

    async flush(timeoutMs) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      });
      try {
        return await Promise.race([waitForPendingWrites(db).then(() => true, () => false), timeout]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
