"use client";

import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ScreensLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div />}>
      {children}
    </Suspense>
  );
}
