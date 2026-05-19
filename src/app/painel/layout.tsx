import type { ReactNode } from "react";

// Auth guard goes here when auth is implemented (Supabase session check)
export default function PainelLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
