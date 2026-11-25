/* In-memory realtime event bus — one per server process.
   API mutations call `publish(...)`; /api/events streams them to
   every connected client over Server-Sent Events, so teacher edits
   appear on student & admin screens instantly. */

export type BusEvent = {
  type:
    | "attendance"
    | "class"
    | "post"
    | "fee"
    | "study"
    | "student"
    | "batch"
    | "sync";
  at: number;
  payload?: Record<string, unknown>;
};

type Listener = (ev: BusEvent) => void;

const g = globalThis as unknown as {
  __academyBus?: { listeners: Set<Listener>; version: number };
};

const state = (g.__academyBus ??= { listeners: new Set<Listener>(), version: 0 });

export function publish(type: BusEvent["type"], payload?: Record<string, unknown>) {
  state.version += 1;
  const ev: BusEvent = { type, at: Date.now(), payload };
  for (const l of state.listeners) {
    try {
      l(ev);
    } catch {
      /* a dead socket must not break writers */
    }
  }
}

export function subscribe(l: Listener): () => void {
  state.listeners.add(l);
  return () => {
    state.listeners.delete(l);
  };
}

export function busVersion() {
  return state.version;
}
