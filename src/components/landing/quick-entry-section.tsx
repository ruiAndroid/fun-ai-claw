"use client";

import { Server, BookOpen, Code2 } from "lucide-react";
import { MotionWrapper } from "./motion-wrapper";
import { motion } from "framer-motion";
import Link from "next/link";

const entries = [
  {
    icon: Server,
    title: "控制台",
    description: "管理 Claw 实例、配置 Agent 与 Skill",
    href: "/console",
    variant: "primary" as const,
  },
  {
    icon: BookOpen,
    title: "文档中心",
    description: "平台架构说明、接入指南与 API 文档",
    href: "/docs",
    variant: "tonal" as const,
  },
  {
    icon: Code2,
    title: "Open API",
    description: "外部前端系统 /open/v1 接口接入参考",
    href: "/docs/open-v1-external-frontend-integration",
    variant: "outlined" as const,
  },
];

const variantStyles = {
  primary:
    "bg-md-primary text-md-on-primary border-transparent shadow-md-2 hover:shadow-md-4",
  tonal:
    "bg-md-surface-container text-md-on-surface border-md-outline-variant/20 hover:bg-md-surface-container-high hover:shadow-md-2",
  outlined:
    "bg-white/60 text-md-on-surface border-md-outline-variant/40 hover:border-md-primary/30 hover:bg-md-surface-container hover:shadow-md-2",
};

export function QuickEntrySection() {
  return (
    <section className="relative py-28 bg-md-surface">
      <div className="mx-auto max-w-6xl px-6">
        <MotionWrapper className="mb-16 text-center">
          <p className="mb-3 text-sm font-bold tracking-[0.15em] uppercase text-md-primary">
            快速入口
          </p>
          <h2 className="text-3xl font-extrabold text-md-on-surface sm:text-4xl">
            即刻开始
          </h2>
        </MotionWrapper>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry, i) => (
            <MotionWrapper key={entry.title} delay={i * 0.1}>
              <Link href={entry.href} className="block">
                <motion.div
                  className={`group relative flex flex-col items-center gap-4 rounded-[28px] border p-10 text-center backdrop-blur-sm transition-all ${variantStyles[entry.variant]}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-[20px] ${
                      entry.variant === "primary"
                        ? "bg-white/20"
                        : "bg-md-primary/10"
                    }`}
                  >
                    <entry.icon
                      size={32}
                      strokeWidth={1.6}
                      className={
                        entry.variant === "primary"
                          ? "text-white"
                          : "text-md-primary"
                      }
                    />
                  </div>
                  <h3
                    className={`text-xl font-bold ${entry.variant === "primary" ? "text-white" : "text-md-on-surface"}`}
                  >
                    {entry.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed ${entry.variant === "primary" ? "text-white/80" : "text-md-on-surface-variant"}`}
                  >
                    {entry.description}
                  </p>

                  {/* Arrow indicator */}
                  <motion.span
                    className={`text-lg ${entry.variant === "primary" ? "text-white/60" : "text-md-primary/40"}`}
                    animate={{ x: [0, 4, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.3,
                    }}
                  >
                    →
                  </motion.span>
                </motion.div>
              </Link>
            </MotionWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}
