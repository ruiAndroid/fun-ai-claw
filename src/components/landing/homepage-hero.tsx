"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Compass, Workflow } from "lucide-react";
import { capabilityMap, capabilityTags, heroHighlights } from "./homepage-data";

export function HomepageHero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(8,47,73,0.96)_0%,rgba(15,118,110,0.94)_46%,rgba(34,197,94,0.84)_100%)] p-6 text-white shadow-[0_28px_80px_rgba(15,118,110,0.25)] sm:p-8"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_24%),radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.16),transparent_22%),radial-gradient(circle_at_60%_82%,rgba(255,255,255,0.10),transparent_26%)]" />
      <div className="absolute -right-14 top-10 h-56 w-56 rounded-full bg-white/12 blur-3xl" />
      <div className="absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-cyan-200/15 blur-3xl" />

      <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_420px] xl:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            {heroHighlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-white/88 backdrop-blur-sm"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase text-cyan-50/82">
            Agent × Skill × Runtime
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
            把 Agent、Skill 与实例
            <br className="hidden sm:block" />
            编排成真正可运营的机器人产品
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
            首页只保留真实入口：控制台、文档与 Open API，让品牌承接、配置编排与外部接入自然衔接。
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/console"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_18px_40px_rgba(255,255,255,0.28)] transition-all duration-300 hover:gap-3"
            >
              打开控制台
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white/16"
            >
              <BookOpen size={16} />
              查看文档
            </Link>
          </div>
        </div>

        <div className="relative">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-[32px] border border-white/14 bg-slate-950/34 p-5 shadow-[0_24px_70px_rgba(2,132,199,0.18)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/70">
                  Capability Map
                </div>
                <div className="mt-1 text-xl font-bold">产品能力地图</div>
              </div>
              <Compass size={16} className="text-cyan-100/75" />
            </div>

            <div className="mt-5 space-y-3">
              {capabilityMap.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4"
                >
                  <div className="text-sm font-bold text-white">{item.title}</div>
                  <div className="mt-1 text-xs leading-6 text-white/68">{item.description}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[28px] border border-white/10 bg-white/8 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white">核心组成</div>
                <Workflow size={16} className="text-cyan-100/75" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {capabilityTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/78"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
