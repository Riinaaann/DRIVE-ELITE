"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("@/App"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function CatchAllPage() {
  return <App />;
}