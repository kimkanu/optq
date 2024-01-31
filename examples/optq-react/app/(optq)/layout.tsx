"use client";

import { OptqProvider } from "@optq/react";
import { useState, type ReactNode, useEffect } from "react";

import { optq, databaseInstallationPromise } from "@/lib/optq";

export default function OptqWrapper({ children }: { children?: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    databaseInstallationPromise.then(() => {
      setReady(true);
    });
  }, []);

  return ready && <OptqProvider value={optq}>{children}</OptqProvider>;
}
