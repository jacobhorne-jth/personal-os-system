"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/stores/app-store";

const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_USER_ID ?? "";

function DataLoader() {
  const loadFromSupabase = useAppStore((s) => s.loadFromSupabase);

  useEffect(() => {
    if (OWNER_ID) loadFromSupabase(OWNER_ID);
  }, [loadFromSupabase]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <DataLoader />
      {children}
    </QueryClientProvider>
  );
}
