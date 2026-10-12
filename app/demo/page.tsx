import type { Metadata } from "next";
import { DemoWorkspace } from "../_components/demo/demo-workspace";

export const metadata: Metadata = {
  title: "Interactive workspace demo",
  description:
    "Explore a public, read-only BuildProof construction control workspace with realistic demonstration data.",
  alternates: { canonical: "/demo" },
};

export default function DemoPage() {
  return <DemoWorkspace />;
}
