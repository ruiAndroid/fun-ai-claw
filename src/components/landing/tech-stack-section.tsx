"use client";

import { MotionWrapper } from "./motion-wrapper";
import { motion } from "framer-motion";

const techGroups = [
  {
    category: "前端",
    items: [
      { name: "Next.js 15", desc: "React Server Components" },
      { name: "Tailwind CSS 4", desc: "Utility-first CSS" },
      { name: "Nextra", desc: "MDX 文档引擎" },
      { name: "Ant Design", desc: "控制台 UI 组件库" },
    ],
    color: "border-sky-200/60 from-sky-50/50",
    tagColor: "bg-sky-100 text-sky-700",
  },
  {
    category: "后台",
    items: [
      { name: "Java / Spring Boot", desc: "API 网关层" },
      { name: "PostgreSQL", desc: "关系型数据库" },
      { name: "WebSocket", desc: "实时双向通信" },
      { name: "REST API", desc: "标准化接口" },
    ],
    color: "border-emerald-200/60 from-emerald-50/50",
    tagColor: "bg-emerald-100 text-emerald-700",
  },
  {
    category: "基础设施",
    items: [
      { name: "Docker", desc: "容器化隔离运行" },
      { name: "zeroclaw", desc: "Claw 核心引擎" },
      { name: "双服务器部署", desc: "API / 执行面分离" },
      { name: "Open API", desc: "第三方接入层" },
    ],
    color: "border-amber-200/60 from-amber-50/50",
    tagColor: "bg-amber-100 text-amber-700",
  },
];

export function TechStackSection() {
  return (
    <section className="relative py-28 bg-gradient-to-b from-white to-md-surface-dim/30">
      <div className="mx-auto max-w-6xl px-6">
        <MotionWrapper className="mb-16 text-center">
          <p className="mb-3 text-sm font-bold tracking-[0.15em] uppercase text-md-primary">
            技术栈
          </p>
          <h2 className="text-3xl font-extrabold text-md-on-surface sm:text-4xl">
            现代化全栈技术体系
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-md-on-surface-variant">
            前后端分离架构，结合容器化部署，打造稳定可靠的 AI 实例管理平台
          </p>
        </MotionWrapper>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {techGroups.map((group, gi) => (
            <MotionWrapper key={group.category} delay={gi * 0.12}>
              <div
                className={`rounded-[28px] border ${group.color} bg-gradient-to-br to-white p-6 shadow-md-1`}
              >
                <div className="mb-5">
                  <span
                    className={`inline-block rounded-full ${group.tagColor} px-4 py-1 text-xs font-bold`}
                  >
                    {group.category}
                  </span>
                </div>
                <div className="space-y-3">
                  {group.items.map((item, i) => (
                    <motion.div
                      key={item.name}
                      className="flex items-center justify-between rounded-[14px] bg-white/80 border border-transparent px-4 py-3 transition-all"
                      whileHover={{
                        x: 3,
                        borderColor: "rgba(15,118,110,0.12)",
                        boxShadow:
                          "0 2px 6px 2px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08)",
                      }}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                    >
                      <span className="text-sm font-bold text-md-on-surface">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-md-on-surface-variant ml-2 text-right">
                        {item.desc}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </MotionWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}
