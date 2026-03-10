"use client";

import {
  Monitor,
  Server,
  Database,
  Container,
  Cpu,
  Boxes,
  ArrowRight,
  Wifi,
} from "lucide-react";
import { MotionWrapper } from "./motion-wrapper";
import { motion } from "framer-motion";

const serverA = [
  {
    icon: Monitor,
    name: "fun-ai-claw",
    desc: "Next.js 前端",
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    icon: Server,
    name: "fun-ai-claw-api",
    desc: "Java API 网关",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Database,
    name: "PostgreSQL",
    desc: "持久化存储",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
];

const serverB = [
  {
    icon: Cpu,
    name: "fun-ai-claw-plane",
    desc: "任务执行引擎",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: Container,
    name: "Docker Engine",
    desc: "容器运行时",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: Boxes,
    name: "Claw 实例集群",
    desc: "zeroclaw 内核",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
];

const protocols = [
  { label: "REST API", path: "/v1/**" },
  { label: "Open API", path: "/open/v1/**" },
  { label: "WebSocket", path: "实时通信" },
];

export function ArchitectureSection() {
  return (
    <section className="relative py-28 bg-gradient-to-b from-md-surface-dim/50 to-white overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        <MotionWrapper className="mb-16 text-center">
          <p className="mb-3 text-sm font-bold tracking-[0.15em] uppercase text-md-primary">
            系统架构
          </p>
          <h2 className="text-3xl font-extrabold text-md-on-surface sm:text-4xl">
            双服务器分层部署
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-md-on-surface-variant">
            API 网关与执行面分离部署，前端统一接入，安全隔离，弹性伸缩
          </p>
        </MotionWrapper>

        <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {/* Server A */}
          <MotionWrapper delay={0.1}>
            <div className="rounded-[28px] border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/50 p-6 shadow-md-1">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-500/10">
                  <Server size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-md-on-surface">
                    服务器 A
                  </h3>
                  <p className="text-xs text-md-on-surface-variant">
                    对外服务节点
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {serverA.map((svc, i) => (
                  <motion.div
                    key={svc.name}
                    className={`flex items-center gap-3 rounded-[16px] ${svc.bg} border border-transparent p-3 transition-all`}
                    whileHover={{
                      x: 4,
                      borderColor: "rgba(15,118,110,0.15)",
                    }}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    <svc.icon size={18} className={svc.color} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-md-on-surface truncate">
                        {svc.name}
                      </div>
                      <div className="text-xs text-md-on-surface-variant">
                        {svc.desc}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </MotionWrapper>

          {/* Connection bridge */}
          <MotionWrapper
            delay={0.2}
            className="flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4 py-6 lg:py-0">
              {protocols.map((p, i) => (
                <motion.div
                  key={p.label}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.12 }}
                >
                  <div className="hidden lg:block h-px w-6 bg-md-primary/20" />
                  <div className="flex items-center gap-2 rounded-full bg-md-primary/8 border border-md-primary/10 px-4 py-2">
                    {i === 2 ? (
                      <Wifi size={13} className="text-md-primary" />
                    ) : (
                      <ArrowRight size={13} className="text-md-primary" />
                    )}
                    <span className="text-xs font-bold text-md-primary whitespace-nowrap">
                      {p.label}
                    </span>
                    <span className="text-[10px] text-md-on-surface-variant">
                      {p.path}
                    </span>
                  </div>
                  <div className="hidden lg:block h-px w-6 bg-md-primary/20" />
                </motion.div>
              ))}
            </div>
          </MotionWrapper>

          {/* Server B */}
          <MotionWrapper delay={0.3}>
            <div className="rounded-[28px] border border-amber-200/60 bg-gradient-to-br from-white to-amber-50/50 p-6 shadow-md-1">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-amber-500/10">
                  <Cpu size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-md-on-surface">
                    服务器 B
                  </h3>
                  <p className="text-xs text-md-on-surface-variant">
                    执行面节点
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {serverB.map((svc, i) => (
                  <motion.div
                    key={svc.name}
                    className={`flex items-center gap-3 rounded-[16px] ${svc.bg} border border-transparent p-3 transition-all`}
                    whileHover={{
                      x: 4,
                      borderColor: "rgba(245,158,11,0.15)",
                    }}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    <svc.icon size={18} className={svc.color} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-md-on-surface truncate">
                        {svc.name}
                      </div>
                      <div className="text-xs text-md-on-surface-variant">
                        {svc.desc}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </MotionWrapper>
        </div>
      </div>
    </section>
  );
}
