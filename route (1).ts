import { subscribe } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events stream. Every API mutation publishes to the
 * in-process bus; this endpoint forwards events to all connected
 * clients instantly — no polling required (clients keep a 30s
 * polling fallback for proxies that buffer SSE).
 */
export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const send = (obj: unknown) => safeEnqueue(`data: ${JSON.stringify(obj)}\n\n`);

      send({ type: "sync", at: Date.now() });
      unsubscribe = subscribe((ev) => send(ev));
      heartbeat = setInterval(() => safeEnqueue(`: ping\n\n`), 20000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
