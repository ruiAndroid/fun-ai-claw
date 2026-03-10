"use client";

import { MotionWrapper } from "./motion-wrapper";
import { motion } from "framer-motion";
import {
  Plus,
  Settings,
  Play,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

interface Step {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
  detail: string;
}

const steps: Step[] = [
  {
    icon: Plus,
    step: "01",
    title: "创建实例",
    description: "选择镜像，一键创建 Claw 实例",
    detail: "基于预设镜像模板创建 Docker 容器实例，支持自定义名称与配置参数。",
  },
  {
    icon: Settings,
    step: "02",
    title: "配置 Agent",
    description: "设定 Agent Guidance 与行为策略",
    detail:
      "为实例绑定 AI Agent，编写 Main Agent Guidance，定义任务处理逻辑与回复风格。",
  },
  {
    icon: Play,
    step: "03",
    title: "编排 Skill",
    description: "分配 Skill 模块，构建能力矩阵",
    detail:
      "从 Skill 库中选择并组合技能集，按需热更新，让每个实例拥有差异化的能力。",
  },
  {
    icon: MessageSquare,
    step: "04",
    title: "开始对话",
    description: "通过控制台或 Open API 接入交互",
    detail:
      "在控制台直接开启 Agent 会话，或通过 /open/v1 接口让外部前端系统接入。",
  },
];

export function WorkflowSection() {
  return (
    <section className="relative py-28 bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        <MotionWrapper className="mb-16 text-center">
          <p className="mb-3 text-sm font-bold tracking-[0.15em] uppercase text-md-primary">
            使用流程
          </p>
          <h2 className="text-3xl font-extrabold text-md-on-surface sm:text-4xl">
            四步启动你的 AI Claw
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-md-on-surface-variant">
            从创建实例到开始对话，快速上手 funClaw 平台
          </p>
        </MotionWrapper>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-md-primary/30 via-md-primary/15 to-transparent hidden lg:block lg:left-1/2 lg:-translate-x-px" />

          <div className="space-y-12 lg:space-y-16">
            {steps.map((s, i) => {
              const isLeft = i % 2 === 0;
              return (
                <MotionWrapper key={s.step} delay={i * 0.12}>
                  <div
                    className={`relative flex flex-col gap-4 pl-16 lg:pl-0 lg:flex-row lg:items-center lg:gap-8 ${isLeft ? "" : "lg:flex-row-reverse"}`}
                  >
                    {/* Content card */}
                    <div
                      className={`flex-1 ${isLeft ? "lg:text-right" : "lg:text-left"}`}
                    >
                      <motion.div
                        className="inline-block rounded-[24px] border border-md-outline-variant/15 bg-white p-6 shadow-md-1 text-left transition-shadow hover:shadow-md-3"
                        whileHover={{ y: -3 }}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-md-primary/10">
                            <s.icon
                              size={20}
                              className="text-md-primary"
                              strokeWidth={2}
                            />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-md-primary">
                              STEP {s.step}
                            </div>
                            <div className="text-base font-bold text-md-on-surface">
                              {s.title}
                            </div>
                          </div>
                        </div>
                        <p className="mb-2 text-sm font-semibold text-md-on-surface">
                          {s.description}
                        </p>
                        <p className="text-xs leading-relaxed text-md-on-surface-variant">
                          {s.detail}
                        </p>
                      </motion.div>
                    </div>

                    {/* Timeline node */}
                    <div className="absolute left-0 top-2 flex h-12 w-12 items-center justify-center lg:relative lg:left-auto lg:top-auto lg:flex-shrink-0">
                      <motion.div
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-md-primary text-white text-sm font-extrabold shadow-md-2 z-10"
                        whileHover={{ scale: 1.1 }}
                      >
                        {s.step}
                      </motion.div>
                    </div>

                    {/* Spacer for opposite side */}
                    <div className="hidden flex-1 lg:block" />
                  </div>
                </MotionWrapper>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
