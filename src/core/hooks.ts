import { useEffect, useRef, useState } from "react";
import { useAppStore } from "./store";
import type { RuntimeSnapshot } from "@shared/types";

/**
 * Hook to detect snapshot changes and only trigger re-renders when relevant data changes
 */
export function useSnapshotSelector<T>(selector: (snapshot: RuntimeSnapshot) => T): T {
  const snapshot = useAppStore((s) => s.snapshot);
  const previousValue = useRef<T | undefined>(undefined);
  const currentValue = selector(snapshot);

  // Deep equality check for objects/arrays
  const hasChanged = JSON.stringify(previousValue.current) !== JSON.stringify(currentValue);
  
  if (hasChanged) {
    previousValue.current = currentValue;
  }

  return previousValue.current !== undefined ? previousValue.current : currentValue;
}

/**
 * Hook to get only metrics without triggering re-renders on other snapshot changes
 */
export function useMetrics() {
  return useSnapshotSelector((s) => s.metrics);
}

/**
 * Hook to get only alerts without triggering re-renders on other snapshot changes
 */
export function useAlerts() {
  return useSnapshotSelector((s) => s.alerts);
}

/**
 * Hook to get only services without triggering re-renders on other snapshot changes
 */
export function useServices() {
  return useSnapshotSelector((s) => s.services);
}

/**
 * Hook to get only ports without triggering re-renders on other snapshot changes
 */
export function usePorts() {
  return useSnapshotSelector((s) => s.ports);
}

/**
 * Hook to get only docker containers without triggering re-renders on other snapshot changes
 */
export function useDocker() {
  return useSnapshotSelector((s) => s.docker);
}

/**
 * Hook to get only logs without triggering re-renders on other snapshot changes
 */
export function useLogs() {
  return useSnapshotSelector((s) => s.logs);
}

/**
 * Debounce hook for expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
