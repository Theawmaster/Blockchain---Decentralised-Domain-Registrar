"use client";
// imports here
import { Suspense } from "react";
// layout for screens with dynamic data
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ScreensLayout({ children }: { children: React.ReactNode }) {
  return (
    // Suspense for loading states
    <Suspense fallback={<div />}>
      {children}
    </Suspense>
  );
}
