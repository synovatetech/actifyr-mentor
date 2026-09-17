"use client";

import { QueryCache, QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { errorToast } from "@/utils/toast";

// Safety net so a failed query/mutation is never silent: any queryFn/mutationFn
// that throws (e.g. `if (!res.success) throw new Error(res.error)`) surfaces a
// toast automatically, even if the calling component doesn't handle `error`/`isError` itself.
const notifyQueryError = (error: unknown) => {
  errorToast(error instanceof Error ? error.message : "Something went wrong. Please try again.");
};

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: notifyQueryError,
        }),
        mutationCache: new MutationCache({
          onError: notifyQueryError,
        }),
        defaultOptions: {
          queries: {
            staleTime: 0,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
