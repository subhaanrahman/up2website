import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * Remounts ErrorBoundary when the route changes so `hasError` does not stick
 * after navigation (e.g. "Go to Home" / bottom nav after a child threw).
 */
export function RouterErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();

  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}
