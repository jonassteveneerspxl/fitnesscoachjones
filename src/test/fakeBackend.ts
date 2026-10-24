import type { RemoteDoc, RemoteSnapshot, WorkoutBackend, WriteOp } from "@/utils/remoteWorkoutRepository";

/**
 * In-memory nabootsing van Firestore voor tests. Bootst het gedrag na waar de repository op rekent:
 * - een schrijfactie wordt direct lokaal toegepast en veroorzaakt een nieuwe snapshot;
 * - zonder bereik (`offline`) blijft het schrijf-promise hangen tot `goOnline()`;
 * - weigert de server achteraf (`rejectWrites`), dan wordt de lokale wijziging teruggedraaid en volgt een snapshot.
 */
export class FakeBackend implements WorkoutBackend {
  docs = new Map<string, Record<string, unknown>>();
  writes: WriteOp[][] = [];
  offline = false;
  rejectWith: unknown = null;
  throwOnWrite: unknown = null;
  listenError: unknown = null;
  /** Wacht met de eerste snapshot tot `releaseFirstSnapshot()` (voor time-out-tests). */
  holdFirstSnapshot = false;
  flushResult = true;
  flushCalls: number[] = [];
  stopped = 0;
  listenCalls = 0;

  private listener: ((s: RemoteSnapshot) => void) | null = null;
  private pendingOnline: (() => void)[] = [];
  private firstHeld = false;

  seed(id: string, data: Record<string, unknown>) {
    this.docs.set(id, data);
  }

  private snapshot(): RemoteSnapshot {
    const docs: RemoteDoc[] = [...this.docs.entries()].map(([id, data]) => ({ id, data: structuredClone(data) }));
    return { docs, fromCache: false, hasPendingWrites: this.pendingOnline.length > 0 };
  }

  private emit() {
    if (this.listener) this.listener(this.snapshot());
  }

  /** Simuleert een wijziging door een ander toestel. */
  remoteChange(id: string, data: Record<string, unknown>) {
    this.docs.set(id, data);
    this.emit();
  }

  listen(onData: (s: RemoteSnapshot) => void, onError: (e: unknown) => void) {
    this.listenCalls++;
    if (this.listenError) {
      const e = this.listenError;
      queueMicrotask(() => onError(e));
      return () => {
        this.stopped++;
      };
    }
    this.listener = onData;
    if (this.holdFirstSnapshot) this.firstHeld = true;
    else queueMicrotask(() => this.emit());
    return () => {
      this.stopped++;
      this.listener = null;
    };
  }

  releaseFirstSnapshot() {
    this.firstHeld = false;
    this.emit();
  }

  write(ops: WriteOp[]): Promise<void> {
    if (this.throwOnWrite) throw this.throwOnWrite;
    this.writes.push(ops);
    const before = new Map(ops.map((op) => [op.id, this.docs.get(op.id)]));
    for (const op of ops) this.docs.set(op.id, structuredClone(op.data));
    queueMicrotask(() => this.emit());

    if (this.rejectWith) {
      const error = this.rejectWith;
      return new Promise<void>((_, reject) => {
        queueMicrotask(() => {
          for (const [id, prev] of before) {
            if (prev === undefined) this.docs.delete(id);
            else this.docs.set(id, prev);
          }
          this.emit();
          reject(error);
        });
      });
    }
    if (this.offline) {
      return new Promise<void>((resolve) => {
        this.pendingOnline.push(resolve);
      });
    }
    return Promise.resolve();
  }

  goOnline() {
    this.offline = false;
    const pending = this.pendingOnline;
    this.pendingOnline = [];
    pending.forEach((resolve) => resolve());
    this.emit();
  }

  async flush(timeoutMs: number) {
    this.flushCalls.push(timeoutMs);
    return this.flushResult;
  }
}

/** Laat openstaande microtaken (snapshots) aflopen. */
export const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
