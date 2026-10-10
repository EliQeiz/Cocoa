"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  onClick,
  loading,
}: {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  tone: "blue" | "orange" | "green" | "red";
  onClick: () => void;
  loading: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      className="stat-card"
      data-tone={tone}
      onClick={onClick}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.24 }}
      aria-label={`${label}: ${loading ? "loading" : value}. ${detail}`}
    >
      <span>
        {label}
        <i>
          <Icon size={20} aria-hidden="true" />
        </i>
      </span>
      <strong aria-busy={loading}>
        {loading ? "—" : `${value}${label === "Completion" ? "%" : ""}`}
      </strong>
      <small>{detail}</small>
      <ArrowUpRight size={17} aria-hidden="true" />
    </motion.button>
  );
}
