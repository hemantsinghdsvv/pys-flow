import { EventEmitter } from "node:events";

export type TaskRealtimeEvent = {
  type:
    | "TASK_CREATED"
    | "TASK_UPDATED"
    | "TASK_MOVED"
    | "TASK_DELETED"
    | "PERMISSION_CHANGED"
    | "TASK_APPROVAL_REQUESTED"
    | "TASK_APPROVED"
    | "TASK_DECLINED"
    | "PROPOSAL_APPROVAL_REQUESTED"
    | "HEARTBEAT";
  taskId?: string;
  projectId?: string | null;
  companyId?: string | null;
  role?: string;
  userId?: string;
  status?: string;
  order?: number;
  task?: Record<string, unknown>;
  timestamp: number;
};

// Use global singleton so it survives Next.js Webpack chunk duplication across Server Actions and API Routes
const globalForEvents = globalThis as unknown as {
  taskEventEmitter?: EventEmitter;
};

export const taskEventEmitter =
  globalForEvents.taskEventEmitter ?? new EventEmitter();

// Allow unlimited listeners for SSE clients
taskEventEmitter.setMaxListeners(100);

globalForEvents.taskEventEmitter = taskEventEmitter;

/**
 * Broadcast an event to all connected realtime clients.
 */
export function broadcastTaskEvent(
  event: Omit<TaskRealtimeEvent, "timestamp">
) {
  const fullEvent: TaskRealtimeEvent = {
    ...event,
    timestamp: Date.now(),
  };
  try {
    // Emit locally for any listeners in the current isolate
    taskEventEmitter.emit("task-event", fullEvent);

    // Bridge the event to the API Route isolate (where the SSE connections live)
    // using absolute URL since this could be called from a Server Action.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
    fetch(`${baseUrl}/api/realtime`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullEvent),
      // Don't wait for or crash on this response
    }).catch((err) => {
      console.warn("Failed to bridge realtime event to SSE route:", err);
    });
  } catch (err) {
    console.error("Failed to broadcast realtime task event:", err);
  }
}

/**
 * Subscribe to realtime task events.
 */
export function subscribeToTaskEvents(
  listener: (event: TaskRealtimeEvent) => void
): () => void {
  taskEventEmitter.on("task-event", listener);
  return () => {
    taskEventEmitter.off("task-event", listener);
  };
}
