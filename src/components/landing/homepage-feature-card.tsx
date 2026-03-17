"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { FeatureCard } from "./homepage-data";
import { ArrowRight } from "lucide-react";

export function HomepageFeatureCard({
  card,
  index,
}: {
  card: FeatureCard;
  index: number;
}) {
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.1 * index, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative overflow-hidden rounded-[32px] border border-white/70 bg-white/82 p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${card.accent}`} />
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/30 blur-3xl" />

      <div className="relative flex h-full flex-col">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/88 shadow-[0_10px_24px_rgba(15,118,110,0.12)]">
          <Icon size={24} className="text-md-primary" strokeWidth={2.1} />
        </div>

        <h3 className="mb-2 text-xl font-bold tracking-tight text-md-on-surface">{card.title}</h3>
        <p className="mb-6 text-sm leading-7 text-md-on-surface-variant">{card.description}</p>

        <div className="mb-6 flex flex-wrap gap-2">
          {card.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-md-outline-variant/40 bg-white/72 px-3 py-1 text-xs font-semibold text-md-on-surface-variant"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-auto">
          <Link
            href={card.href}
            className="inline-flex items-center gap-2 rounded-full bg-md-primary px-4 py-2.5 text-sm font-semibold text-md-on-primary shadow-md-2 transition-all duration-300 hover:gap-3 hover:shadow-md-4"
          >
            {card.ctaLabel}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
