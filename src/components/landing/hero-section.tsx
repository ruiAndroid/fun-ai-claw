"use client";

import { motion } from "framer-motion";
import { Bot, Server, Wrench, Cpu, Zap, Layers } from "lucide-react";
import Link from "next/link";

const floatingIcons = [
  { Icon: Server, x: "12%", y: "18%", size: 28, delay: 0, duration: 6 },
  { Icon: Bot, x: "82%", y: "22%", size: 32, delay: 0.5, duration: 7 },
  { Icon: Wrench, x: "8%", y: "72%", size: 24, delay: 1, duration: 5.5 },
  { Icon: Cpu, x: "88%", y: "68%", size: 26, delay: 1.5, duration: 6.5 },
  { Icon: Zap, x: "22%", y: "85%", size: 22, delay: 0.8, duration: 5 },
  { Icon: Layers, x: "75%", y: "82%", size: 24, delay: 1.2, duration: 7.5 },
];

const titleWords = ["AI-Powered", "Claw", "Orchestration"];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
          className="absolute text-md-primary/20 pointer-events-none"
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
      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        {/* Brand pill */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 inline-flex items-center gap-2 rounded-full bg-md-primary-container/40 px-5 py-2 text-sm font-semibold text-md-on-primary-container backdrop-blur-sm border border-md-primary/10"
        >
          <Zap size={16} />
          funClaw Platform
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
          基于 Docker 的智能 Claw 实例管理平台
          <br className="hidden sm:block" />
          支持 Agent 智能配置与 Skill 自由编排
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

        {/* Scroll indicator */}
        <motion.div
          className="mt-16 flex flex-col items-center gap-2 text-md-on-surface-variant/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
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
      </div>
    </section>
  );
}
