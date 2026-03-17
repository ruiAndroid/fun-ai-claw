"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CircleCheckBig, Sparkles } from "lucide-react";
import { XiamiIcon } from "@/components/ui/xiami-icon";
import {
  capabilityTags,
  heroHighlights,
  heroProofPoints,
  heroStartSteps,
} from "./homepage-data";

function HeroProofCard({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/78">
        {index}
      </div>
      <h3 className="mt-2 text-sm font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-6 text-white/70">{description}</p>
    </article>
  );
}

function HeroStartStep({
  step,
  title,
  actionLabel,
  href,
}: {
  step: string;
  title: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <article className="rounded-[22px] border border-white/10 bg-white/7 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/72">
        {step}
      </div>
      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="max-w-[220px] text-sm font-bold leading-6 text-white">{title}</p>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a5f3fc_0%,#67e8f9_42%,#5eead4_100%)] px-4 py-2 text-xs font-black text-slate-950 shadow-[0_14px_28px_rgba(94,234,212,0.2)] transition-transform duration-300 hover:scale-[1.03]"
        >
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}

export function HomepageHero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(15,39,59,0.98)_0%,rgba(17,109,103,0.95)_48%,rgba(88,214,141,0.86)_100%)] p-5 text-white shadow-[0_28px_80px_rgba(15,118,110,0.24)] sm:p-8 lg:p-10"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_76%_10%,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_68%_76%,rgba(255,255,255,0.08),transparent_22%)]" />
        <div className="absolute left-[18%] top-[26%] h-44 w-80 rounded-[32px] bg-white/6 blur-3xl" />
        <div className="absolute right-[-5rem] top-8 h-72 w-72 rounded-full bg-emerald-300/12 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-1/2 h-48 w-48 rounded-full bg-cyan-300/12 blur-3xl" />
      </div>

      <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start">
        <div className="pt-1">
          <div className="flex flex-wrap gap-2">
            {heroHighlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/86 backdrop-blur-sm"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1 text-[11px] font-black tracking-[0.24em] uppercase text-cyan-50/82">
            Agent × Skill × Runtime
          </div>

          <div className="mt-6 max-w-[44rem] rounded-[30px] bg-white/6 px-5 py-6 backdrop-blur-[2px] sm:px-6">
            <div className="text-[34px] font-black leading-none tracking-[-0.05em] text-white sm:text-[52px]">
              FunClaw
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-4">
              <span className="h-[3px] w-14 rounded-full bg-white/78 sm:w-18" />
              <div className="flex flex-wrap items-center gap-2 text-[26px] font-black leading-tight tracking-[-0.05em] text-white sm:text-[40px]">
                <span>视听行业专属 AI 小龙虾</span>
                <XiamiIcon size={28} title="FunClaw" />
              </div>
            </div>
          </div>

          <p className="mt-6 max-w-3xl text-sm leading-7 text-white/78 sm:text-base">
            一站式为链路型 AI 解决方案落地，提供“让人人都能做好 AI 应用”的产品入口，
            为视听行业带来全链路 AI 能力升级。
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {heroProofPoints.map((item) => (
              <HeroProofCard
                key={item.index}
                index={item.index}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
        </div>

        <motion.aside
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
          className="rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(26,89,72,0.82)_0%,rgba(45,113,87,0.82)_100%)] p-5 shadow-[0_24px_70px_rgba(15,118,110,0.24)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black text-white/84">
              Beginning
            </span>
            <CircleCheckBig size={16} className="text-cyan-100/72" />
          </div>

          <div className="mt-4 text-lg font-black text-white">现在让我们开始！！</div>

          <div className="mt-5 space-y-3">
            {heroStartSteps.map((item) => (
              <HeroStartStep
                key={item.step}
                step={item.step}
                title={item.title}
                actionLabel={item.actionLabel}
                href={item.href}
              />
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-white/7 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-white">核心战区</div>
              <Sparkles size={16} className="text-cyan-100/72" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {capabilityTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold text-white/74"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-5">
              <Link
                href="/docs/open-v1-external-frontend-integration"
                className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors duration-300 hover:bg-white/16"
              >
                Open API
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </motion.aside>
      </div>
    </motion.section>
  );
}
