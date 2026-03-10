"use client";

import { Server, Bot, Wrench } from "lucide-react";
import { MotionWrapper } from "./motion-wrapper";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface Capability {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  iconBg: string;
}

const capabilities: Capability[] = [
  {
    icon: Server,
    title: "Docker 实例管理",
    description:
      "一键创建、启停、回滚沙箱化 Claw 实例。基于容器隔离，安全可靠，弹性伸缩。实时监控实例状态与资源使用。",
    gradient: "from-emerald-500/10 to-teal-500/10",
    iconBg: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: Bot,
    title: "Agent 智能配置",
    description:
      "灵活配置 AI Agent 参数与行为策略。支持自定义 Guidance、多会话模式（Auto / Direct），让每个实例拥有独特能力。",
    gradient: "from-teal-500/10 to-cyan-500/10",
    iconBg: "bg-teal-500/10 text-teal-600",
  },
  {
    icon: Wrench,
    title: "Skill 编排调度",
    description:
      "管理和分配 Skill 模块到实例。自由组合技能集，构建差异化的智能体能力矩阵，实现按需编排与热更新。",
    gradient: "from-cyan-500/10 to-sky-500/10",
    iconBg: "bg-cyan-500/10 text-cyan-600",
  },
];

export function CapabilitiesSection() {
  return (
    <section className="relative py-28 bg-gradient-to-b from-white to-md-surface-dim/50">
      {/* Section header */}
      <div className="mx-auto max-w-6xl px-6">
        <MotionWrapper className="mb-16 text-center">
          <p className="mb-3 text-sm font-bold tracking-[0.15em] uppercase text-md-primary">
            核心能力
          </p>
          <h2 className="text-3xl font-extrabold text-md-on-surface sm:text-4xl">
            为 AI 实例编排而生
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-md-on-surface-variant">
            从容器管理到智能体配置，funClaw 提供完整的 Claw 实例全生命周期管理
          </p>
        </MotionWrapper>

        {/* Capability cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap, i) => (
            <MotionWrapper key={cap.title} delay={i * 0.12}>
              <motion.div
                className={`group relative rounded-[28px] border border-md-outline-variant/20 bg-gradient-to-br ${cap.gradient} p-8 backdrop-blur-sm transition-shadow`}
                whileHover={{
                  y: -4,
                  boxShadow:
                    "0 6px 10px 4px rgba(0,0,0,0.08), 0 2px 3px rgba(0,0,0,0.12)",
                }}
                transition={{ duration: 0.25 }}
              >
                {/* Icon */}
                <div
                  className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[16px] ${cap.iconBg}`}
                >
                  <cap.icon size={28} strokeWidth={1.8} />
                </div>

                {/* Title */}
                <h3 className="mb-3 text-xl font-bold text-md-on-surface">
                  {cap.title}
                </h3>

                {/* Description */}
                <p className="text-sm leading-relaxed text-md-on-surface-variant">
                  {cap.description}
                </p>

                {/* Hover decoration */}
                <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-md-primary/0 transition-colors group-hover:bg-md-primary/40" />
              </motion.div>
            </MotionWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}
