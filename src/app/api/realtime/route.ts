import { NextRequest } from "next/server";
import { subscribeToTaskEvents, taskEventEmitter, type TaskRealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(req: Request | NextRequest) {
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const initialPayload: TaskRealtimeEvent = {
        type: "HEARTBEAT",
        timestamp: Date.now(),
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialPayload)}\n\n`)
      );

      // Keepalive heartbeat
      intervalId = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "HEARTBEAT",
                timestamp: Date.now(),
              })}\n\n`
            )
          );
        } catch {
          cleanup();
        }
      }, 15000);

      // Listen for broadcasts
      unsubscribe = subscribeToTaskEvents((event) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          cleanup();
        }
      });

      function cleanup() {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {}
      }

      if (req.signal) {
        req.signal.addEventListener("abort", cleanup);
      }
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: Request) {
  try {
    const event = await req.json();
    // Directly emit on the global EventEmitter for this isolate
    taskEventEmitter.emit("task-event", event);
    return new Response("Broadcasted", { status: 200 });
  } catch (err) {
    return new Response("Bad Request", { status: 400 });
  }
}

