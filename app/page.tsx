import type { Metadata } from "next";
import { LandingPage } from "./_components/landing/landing-page";

export const metadata: Metadata = {
  title: "BuildProof | Construction evidence you can defend",
  description:
    "Connect approved quantities, field evidence, material verification and release decisions in one accountable construction record.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <LandingPage />;
}
