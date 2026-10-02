"use client";

import { useEffect, useState, useRef } from "react";
import type { TaskRealtimeEvent } from "@/lib/realtime";

export function useRealtimeTasks(
  onEvent?: (event: TaskRealtimeEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<TaskRealtimeEvent | null>(null);
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let mounted = true;

    function connect() {
      if (!mounted) return;

      try {
        eventSource = new EventSource("/api/realtime");

        eventSource.onopen = () => {
          if (mounted) {
            setIsConnected(true);
          }
        };

        eventSource.onmessage = (e) => {
          if (!mounted) return;
          try {
            const data: TaskRealtimeEvent = JSON.parse(e.data);
            if (data.type !== "HEARTBEAT") {
              setLastEvent(data);
              callbackRef.current?.(data);
            }
          } catch (err) {
            console.error("Failed to parse realtime event:", err);
          }
        };

        eventSource.onerror = () => {
          if (!mounted) return;
          setIsConnected(false);
          eventSource?.close();
          // Attempt reconnection after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        console.error("Failed to establish EventSource connection:", err);
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      mounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return { isConnected, lastEvent };
}
