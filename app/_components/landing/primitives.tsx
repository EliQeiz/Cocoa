import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentType, ReactNode, SVGProps } from "react";

const buttonStyles = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#BFE8F7] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[#E96B2C] text-white shadow-[0_9px_24px_rgba(233,107,44,0.2)] hover:-translate-y-0.5 hover:bg-[#D65A20] hover:shadow-[0_12px_28px_rgba(233,107,44,0.25)]",
        secondary: "border border-[#C8DCE6] bg-white text-[#102B43] hover:-translate-y-0.5 hover:border-[#66C4E8] hover:bg-[#F4FBFD]",
        ghost: "bg-transparent text-[#526878] hover:bg-[#F1FAFD] hover:text-[#102B43]",
      },
      size: {
        default: "px-5",
        large: "min-h-14 px-6 text-base",
        compact: "min-h-10 px-4",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

type ButtonProps = VariantProps<typeof buttonStyles> & {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
};

export function Button({ href, children, variant, size, className = "", external = false }: ButtonProps) {
  const classes = buttonStyles({ variant, size, className });
  if (external || href.startsWith("mailto:")) {
    return <a href={href} className={classes}>{children}</a>;
  }
  return <Link href={href} className={classes}>{children}</Link>;
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1360px] px-5 sm:px-8 lg:px-12 ${className}`}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="mb-4 inline-flex min-h-8 items-center rounded-lg border border-[#F8D1BA] bg-[#FFF5EF] px-3 text-sm font-bold tracking-[0.045em] text-[#C9531F]">{children}</div>;
}

export function SectionHeader({ eyebrow, title, description, align = "left", className = "" }: { eyebrow: string; title: string; description?: string; align?: "left" | "center"; className?: string }) {
  return (
    <header className={`${align === "center" ? "mx-auto text-center" : ""} ${className}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-heading text-[clamp(2rem,3.2vw,2.85rem)] font-extrabold leading-[1.1] tracking-[-0.035em] text-[#102B43]">{title}</h2>
      {description ? <p className={`mt-4 max-w-[700px] text-[17px] leading-7 text-[#617586] ${align === "center" ? "mx-auto" : ""}`}>{description}</p> : null}
    </header>
  );
}

const chipStyles = cva("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", {
  variants: {
    tone: {
      orange: "bg-[#FFF0E7] text-[#E96B2C]",
      sky: "bg-[#E3F5FB] text-[#2789B0]",
      emerald: "bg-[#E8F6F1] text-[#24785F]",
      violet: "bg-[#EEF0FF] text-[#5360A8]",
      slate: "bg-[#EDF2F5] text-[#526878]",
      amber: "bg-[#FFF6E6] text-[#A86D13]",
      green: "bg-[#E8F6F1] text-[#24785F]",
      navy: "bg-[#DDE8EF] text-[#102B43]",
    },
  },
  defaultVariants: { tone: "orange" },
});

export function IconChip({ icon: Icon, tone = "orange", className = "" }: { icon: ComponentType<SVGProps<SVGSVGElement>>; tone?: VariantProps<typeof chipStyles>["tone"]; className?: string }) {
  return <span className={chipStyles({ tone, className })}><Icon width={22} height={22} strokeWidth={1.9} aria-hidden="true" /></span>;
}

const featureStyles = cva("rounded-[18px] border p-6 shadow-card transition duration-200", {
  variants: {
    tone: {
      white: "border-[#DCE7ED] bg-white hover:border-[#9FCFE1] hover:shadow-card-hover",
      orange: "border-[#F8D1BA] bg-[#FFF8F4] hover:border-[#F4B48E]",
      sky: "border-[#CAE8F3] bg-[#F3FBFD] hover:border-[#9DDCF0]",
      emerald: "border-[#CDE8DE] bg-[#F4FBF8] hover:border-[#9FD2BF]",
      violet: "border-[#DDE0F4] bg-[#F8F8FE] hover:border-[#BCC1E2]",
      amber: "border-[#F2DEB8] bg-[#FFFBF2] hover:border-[#E8C984]",
      green: "border-[#CDE8DE] bg-[#F4FBF8] hover:border-[#9FD2BF]",
      navy: "border-[#C8D7E0] bg-[#F3F7F9] hover:border-[#91AABA]",
    },
  },
  defaultVariants: { tone: "white" },
});

export function FeatureCard({ children, tone = "white", className = "" }: { children: ReactNode; tone?: VariantProps<typeof featureStyles>["tone"]; className?: string }) {
  return <article className={featureStyles({ tone, className })}>{children}</article>;
}

export function StatCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <article className={`rounded-2xl border border-sky-100 bg-white p-6 shadow-card transition duration-200 hover:-translate-y-1.5 hover:border-sky-200 hover:shadow-card-hover sm:p-7 ${className}`}>{children}</article>;
}

export function WaveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 ${flip ? "top-0 rotate-180" : "bottom-0"}`} aria-hidden="true">
      <svg viewBox="0 0 1440 72" className="block h-auto w-full" fill="none" preserveAspectRatio="none">
        <path d="M0 45C227 75 384 0 653 24C899 46 1076 91 1440 26V72H0V45Z" fill="white" />
      </svg>
    </div>
  );
}
