"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Server,
  Wrench,
  Cpu,
  Zap,
  Layers,
  Container,
  Shield,
  Activity,
  GitBranch,
} from "lucide-react";
import Link from "next/link";

const floatingIcons = [
  { Icon: Server, x: "10%", y: "15%", size: 28, delay: 0, duration: 6 },
  { Icon: Bot, x: "85%", y: "18%", size: 32, delay: 0.5, duration: 7 },
  { Icon: Wrench, x: "6%", y: "68%", size: 24, delay: 1, duration: 5.5 },
  { Icon: Cpu, x: "90%", y: "65%", size: 26, delay: 1.5, duration: 6.5 },
  { Icon: Zap, x: "20%", y: "82%", size: 22, delay: 0.8, duration: 5 },
  { Icon: Layers, x: "78%", y: "80%", size: 24, delay: 1.2, duration: 7.5 },
  { Icon: Container, x: "50%", y: "12%", size: 20, delay: 0.3, duration: 8 },
  { Icon: Shield, x: "35%", y: "85%", size: 20, delay: 1.8, duration: 6 },
];

const titleWords = ["AI-Powered", "Claw", "Orchestration"];

const highlights = [
  { icon: Container, label: "容器隔离", desc: "基于 Docker 沙箱" },
  { icon: Activity, label: "实时监控", desc: "实例状态全掌控" },
  { icon: GitBranch, label: "多实例编排", desc: "灵活扩缩容" },
  { icon: Shield, label: "安全可靠", desc: "zeroclaw 内核" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-md-surface" />
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(15,118,110,0.4) 0%, transparent 70%)",
          }}
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.05, 0.98, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-30%] right-[-15%] w-[60vw] h-[60vw] rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(circle, rgba(20,184,166,0.35) 0%, transparent 70%)",
          }}
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 40, -20, 0],
            scale: [1, 0.97, 1.04, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[30%] right-[20%] w-[40vw] h-[40vw] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)",
          }}
          animate={{
            x: [0, 20, -30, 0],
            y: [0, -20, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #0f766e 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Floating icons */}
      {floatingIcons.map(({ Icon, x, y, size, delay, duration }, i) => (
        <motion.div
          key={i}
          className="absolute text-md-primary/20 pointer-events-none hidden sm:block"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0.15, 0.35, 0.15],
            scale: [0.9, 1.1, 0.9],
            y: [0, -18, 0],
            rotate: [0, 8, -8, 0],
          }}
          transition={{
            duration,
            repeat: Infinity,
            delay,
            ease: "easeInOut",
          }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      ))}

      {/* Main content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center pt-24 pb-8">
        {/* Brand pill */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 inline-flex items-center gap-2 rounded-full bg-md-primary-container/40 px-5 py-2 text-sm font-semibold text-md-on-primary-container backdrop-blur-sm border border-md-primary/10"
        >
          <Zap size={16} />
          funClaw Platform · 基于 zeroclaw 内核
        </motion.div>

        {/* Title with staggered word reveal */}
        <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-md-on-surface sm:text-6xl lg:text-7xl">
          {titleWords.map((word, i) => (
            <motion.span
              key={word}
              className={`inline-block mr-4 ${i === 0 ? "bg-gradient-to-r from-md-primary to-md-secondary bg-clip-text text-transparent" : ""}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.3 + i * 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.p
          className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-md-on-surface-variant sm:text-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          基于 Docker 容器化的智能 Claw 实例管理平台
          <br className="hidden sm:block" />
          支持 Agent 智能配置、Skill 自由编排与 Open API 接入
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href="/console">
            <motion.div
              className="group inline-flex items-center gap-2 rounded-[28px] bg-md-primary px-8 py-4 text-base font-bold text-md-on-primary shadow-md-2 transition-shadow hover:shadow-md-4"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Server size={20} />
              进入控制台
              <motion.span
                className="inline-block"
                animate={{ x: [0, 4, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                →
              </motion.span>
            </motion.div>
          </Link>
          <Link href="/docs">
            <motion.div
              className="inline-flex items-center gap-2 rounded-[28px] border-2 border-md-outline-variant bg-white/60 px-8 py-4 text-base font-bold text-md-on-surface backdrop-blur-sm transition-all hover:border-md-primary/30 hover:bg-md-surface-container hover:shadow-md-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              查看文档
            </motion.div>
          </Link>
        </motion.div>

        {/* Highlight badges row */}
        <motion.div
          className="mt-14 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {highlights.map((h, i) => (
            <motion.div
              key={h.label}
              className="flex items-center gap-3 rounded-[20px] border border-md-outline-variant/20 bg-white/70 px-5 py-3 backdrop-blur-sm"
              whileHover={{
                y: -2,
                boxShadow:
                  "0 4px 8px 3px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.12)",
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 1.3 + i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-md-primary/10">
                <h.icon size={18} className="text-md-primary" strokeWidth={2} />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-md-on-surface">
                  {h.label}
                </div>
                <div className="text-xs text-md-on-surface-variant">
                  {h.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Architecture preview card */}
      <motion.div
        className="relative z-10 mx-auto mt-8 mb-8 w-full max-w-4xl px-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="rounded-[28px] border border-md-outline-variant/20 bg-white/80 p-6 backdrop-blur-md shadow-md-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <div className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-3 text-xs font-medium text-md-on-surface-variant">
              funClaw Architecture
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Server A */}
            <div className="rounded-[20px] border border-md-primary/15 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
              <div className="mb-3 text-xs font-bold tracking-wider uppercase text-md-primary">
                Server A · 对外服务
              </div>
              <div className="space-y-2">
                {[
                  { name: "fun-ai-claw", tag: "前端 UI", color: "bg-sky-100 text-sky-700" },
                  { name: "fun-ai-claw-api", tag: "API 层", color: "bg-emerald-100 text-emerald-700" },
                  { name: "PostgreSQL", tag: "数据库", color: "bg-violet-100 text-violet-700" },
                ].map((svc) => (
                  <motion.div
                    key={svc.name}
                    className="flex items-center justify-between rounded-[12px] bg-white/90 px-3 py-2"
                    whileHover={{ x: 2 }}
                  >
                    <span className="text-xs font-semibold text-md-on-surface">
                      {svc.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${svc.color}`}
                    >
                      {svc.tag}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Connection */}
            <div className="flex flex-col items-center justify-center gap-2 py-4">
              <motion.div
                className="flex items-center gap-1 text-md-primary/60"
                animate={{ x: [0, 6, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="h-px w-8 bg-md-primary/30" />
                <span className="text-xs font-bold">REST / WS</span>
                <div className="h-px w-8 bg-md-primary/30" />
              </motion.div>
              <div className="flex items-center gap-2 rounded-full bg-md-primary/10 px-4 py-1.5">
                <Activity
                  size={14}
                  className="text-md-primary"
                  strokeWidth={2}
                />
                <span className="text-[11px] font-bold text-md-primary">
                  /v1 · /open/v1
                </span>
              </div>
              <motion.div
                className="flex items-center gap-1 text-md-primary/60"
                animate={{ x: [0, -6, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              >
                <div className="h-px w-8 bg-md-primary/30" />
                <span className="text-xs font-bold">gRPC</span>
                <div className="h-px w-8 bg-md-primary/30" />
              </motion.div>
            </div>

            {/* Server B */}
            <div className="rounded-[20px] border border-amber-500/15 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
              <div className="mb-3 text-xs font-bold tracking-wider uppercase text-amber-600">
                Server B · 执行面
              </div>
              <div className="space-y-2">
                {[
                  {
                    name: "fun-ai-claw-plane",
                    tag: "执行引擎",
                    color: "bg-amber-100 text-amber-700",
                  },
                  {
                    name: "Docker Engine",
                    tag: "容器运行时",
                    color: "bg-orange-100 text-orange-700",
                  },
                  {
                    name: "Claw Instances",
                    tag: "实例集群",
                    color: "bg-rose-100 text-rose-700",
                  },
                ].map((svc) => (
                  <motion.div
                    key={svc.name}
                    className="flex items-center justify-between rounded-[12px] bg-white/90 px-3 py-2"
                    whileHover={{ x: 2 }}
                  >
                    <span className="text-xs font-semibold text-md-on-surface">
                      {svc.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${svc.color}`}
                    >
                      {svc.tag}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="relative z-10 mt-4 mb-8 flex flex-col items-center gap-2 text-md-on-surface-variant/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <span className="text-xs font-medium tracking-wider uppercase">
          探索更多
        </span>
        <motion.div
          className="h-8 w-5 rounded-full border-2 border-md-on-surface-variant/30 p-1"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="h-2 w-1 rounded-full bg-md-on-surface-variant/50 mx-auto" />
        </motion.div>
      </motion.div>
    </section>
  );
}
