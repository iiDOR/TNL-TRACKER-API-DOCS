"use client";

import dynamic from "next/dynamic";

const RedocStandalone = dynamic(
  () => import("redoc").then((m) => m.RedocStandalone),
  { ssr: false, loading: () => <p style={{ padding: "2rem", color: "#ccc" }}>Loading docs…</p> }
);

export default function Home() {
  return (
    <RedocStandalone
      specUrl="/api/openapi"
      options={{
        theme: {
          colors: { primary: { main: "#3b82f6" } },
          backgroundColor: "#0a0a0a",
          sidebar: { backgroundColor: "#111111", textColor: "#ededed" },
          rightPanel: { backgroundColor: "#161616" },
          typography: { fontFamily: "inherit", fontSize: "14px" },
        },
        hideDownloadButton: false,
        expandResponses: "200",
        pathInMiddlePanel: true,
      }}
    />
  );
}
