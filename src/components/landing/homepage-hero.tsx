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
    <article className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)] px-4 py-3.5 backdrop-blur-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/76">
        {index} / 阶段
      </div>
      <h3 className="mt-2 text-sm font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-white/70">{description}</p>
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
    <article className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/70">
        {step}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="max-w-[190px] text-[13px] font-bold leading-5 text-white">{title}</p>
        <Link
          href={href}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-cyan-100/22 bg-[linear-gradient(135deg,#d9fdff_0%,#96f6fa_46%,#7ceacc_100%)] px-4 text-[11px] font-black text-slate-950 shadow-[0_10px_24px_rgba(125,211,252,0.16)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_14px_28px_rgba(125,211,252,0.22)]"
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
      className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(135deg,#314e68_0%,#2f8f85_52%,#8fe1ba_100%)] p-5 text-white shadow-[0_24px_68px_rgba(15,118,110,0.18)] sm:p-6 lg:p-7"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(255,255,255,0.22),transparent_24%),radial-gradient(circle_at_82%_14%,rgba(255,255,255,0.16),transparent_20%),radial-gradient(circle_at_70%_76%,rgba(255,255,255,0.10),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_50%,rgba(255,255,255,0.05)_100%)]" />
        <div className="absolute left-[18%] top-[20%] h-36 w-80 rounded-[36px] bg-white/10 blur-3xl" />
        <div className="absolute right-[-6rem] top-4 h-64 w-64 rounded-full bg-emerald-200/18 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-[46%] h-44 w-44 rounded-full bg-cyan-200/16 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_0%,transparent_24%,transparent_72%,rgba(255,255,255,0.03)_100%)]" />
      </div>

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_352px] xl:items-start">
        <div className="pt-1">
          <div className="flex flex-wrap gap-2">
            {heroHighlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/12 bg-white/12 px-3 py-1 text-[11px] font-semibold text-white/86 backdrop-blur-sm"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1 text-[11px] font-black tracking-[0.24em] uppercase text-cyan-50/84">
            Agent × Skill × Runtime
          </div>

          <div className="mt-5 max-w-[34rem] rounded-[28px] bg-[linear-gradient(90deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.06)_72%,rgba(255,255,255,0.02)_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[3px] sm:px-6">
            <div className="text-[32px] font-black leading-none tracking-[-0.05em] text-white sm:text-[46px]">
              FunClaw
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-3 sm:gap-4">
              <span className="h-[3px] w-12 rounded-full bg-white/80 sm:w-14" />
              <div className="flex flex-wrap items-center gap-2 text-[22px] font-black leading-tight tracking-[-0.05em] text-white sm:text-[34px]">
                <span>视听行业专属 AI 小龙虾</span>
                <XiamiIcon size={24} title="FunClaw" />
              </div>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/82 sm:text-[15px]">
            一站式为链路型 AI 解决方案落地，提供“让人人都能做好 AI 应用”的产品入口，
            为视听行业带来全链路 AI 能力升级。
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
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
          className="relative rounded-[28px] border border-white/14 bg-[linear-gradient(180deg,rgba(64,122,106,0.68)_0%,rgba(58,110,92,0.58)_100%)] p-3 shadow-[0_20px_54px_rgba(15,118,110,0.14)] backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_22%,transparent_78%,rgba(255,255,255,0.03)_100%)]" />
          <div className="relative rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(35,91,77,0.22)_0%,rgba(35,91,77,0.08)_100%)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black text-white/84">
                Beginning
              </span>
              <CircleCheckBig size={16} className="text-cyan-100/74" />
            </div>

            <div className="mt-3 text-[17px] font-black text-white">现在让我们开始！！</div>

            <div className="mt-4 space-y-2.5">
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

            <div className="mt-4 rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)] p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-white">核心战区</div>
                <Sparkles size={16} className="text-cyan-100/72" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {capabilityTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold text-white/74"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4">
                <Link
                  href="/docs/open-v1-external-frontend-integration"
                  className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors duration-300 hover:bg-white/16"
                >
                  Open API
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </motion.section>
  );
}
