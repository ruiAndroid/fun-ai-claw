"use client";

import { useEffect } from "react";
import { HomepageFeatureCard } from "./homepage-feature-card";
import { HomepageHero } from "./homepage-hero";
import { primaryCards, secondaryCards } from "./homepage-data";
import { HomepageSectionHeader } from "./homepage-section-header";
import { HomepageSidebar } from "./homepage-sidebar";
import { HomepageTopbar } from "./homepage-topbar";

export function LandingPage() {
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <main className="relative h-screen overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,0.32),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.18),transparent_28%),linear-gradient(180deg,#f8fffe_0%,#f4fbfa_48%,#f8fffe_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-12 h-72 w-72 rounded-full bg-teal-300/15 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/3 h-56 w-56 rounded-full bg-violet-300/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(15,118,110,0.05)_1px,transparent_1px)] [background-size:22px_22px] opacity-30" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1920px] items-start">
        <HomepageSidebar />

        <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6 xl:px-10">
          <HomepageTopbar />

          <div className="mt-6 grid gap-6">
            <HomepageHero />

            <section>
              <HomepageSectionHeader
                eyebrow="Primary Entry"
                title="先把真正重要的入口做强"
                description="聚焦机器人控制台、文档中心和 Open API 三个主入口，不展示社区与定时任务等当前不需要的模块。"
              />
              <div className="grid gap-6 lg:grid-cols-3">
                {primaryCards.map((card, index) => (
                  <HomepageFeatureCard key={card.title} card={card} index={index} />
                ))}
              </div>
            </section>

            <section>
              <HomepageSectionHeader
                eyebrow="Product Surface"
                title="让首页承担说明、入口与转化"
                description="首页不再堆假数据，而是展示真实的产品结构、能力入口与使用路径，让用户自然进入 FunClaw 的机器人体系。"
              />
              <div className="grid gap-6 lg:grid-cols-3">
                {secondaryCards.map((card, index) => (
                  <HomepageFeatureCard
                    key={card.title}
                    card={card}
                    index={index + primaryCards.length}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
