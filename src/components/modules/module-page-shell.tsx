import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { HomepageTopbar } from "@/components/landing/homepage-topbar";

export type ModulePageMetric = {
  label: string;
  value: string;
  hint: string;
};

export type ModulePageActivity = {
  title: string;
  summary: string;
  meta: string;
  status: string;
};

export function ModulePageShell({
  eyebrow,
  title,
  description,
  icon: Icon,
  metrics,
  activities,
  actionLabel,
  actionHref,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  metrics: ModulePageMetric[];
  activities: ModulePageActivity[];
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,0.22),transparent_24%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.16),transparent_22%),linear-gradient(180deg,#f8fffe_0%,#f5fbff_48%,#f8fffe_100%)]">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6 xl:px-10">
        <HomepageTopbar />

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-6">
            <div className="rounded-[32px] border border-white/70 bg-white/78 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-4">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/86 px-4 py-2 text-sm font-semibold text-md-on-surface shadow-sm transition-transform duration-300 hover:-translate-y-0.5"
                  >
                    <ChevronLeft size={16} />
                    返回首页
                  </Link>

                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-cyan-100/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-900">
                    <Icon size={14} />
                    {eyebrow}
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-[40px]">
                      {title}
                    </h1>
                    <p className="max-w-3xl text-sm leading-7 text-md-on-surface-variant sm:text-base">
                      {description}
                    </p>
                  </div>
                </div>

                <Link
                  href={actionHref}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-200 px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_16px_36px_rgba(34,211,238,0.18)] transition-transform duration-300 hover:scale-[1.02]"
                >
                  {actionLabel}
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {metrics.map((item) => (
                  <article
                    key={item.label}
                    className="rounded-[24px] border border-white/70 bg-white/86 p-5 shadow-[0_18px_36px_rgba(15,23,42,0.05)]"
                  >
                    <div className="text-sm font-semibold text-md-on-surface-variant">{item.label}</div>
                    <div className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">
                      {item.value}
                    </div>
                    <div className="mt-2 text-sm text-md-on-surface-variant">{item.hint}</div>
                  </article>
                ))}
              </div>
            </div>

            <section className="rounded-[32px] border border-white/70 bg-white/78 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
                    Temporary Mock Data
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">
                    当前模块预览
                  </h2>
                </div>
                <div className="rounded-full border border-white/70 bg-white/86 px-4 py-2 text-sm font-semibold text-md-on-surface shadow-sm">
                  仅用于前端占位
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {activities.map((item) => (
                  <article
                    key={`${item.title}-${item.meta}`}
                    className="rounded-[24px] border border-white/70 bg-white/86 p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                        <p className="text-sm leading-7 text-md-on-surface-variant">{item.summary}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                      {item.meta}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-white/70 bg-white/78 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
                Next Step
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950">
                后续接真实数据
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-md-on-surface-variant">
                <p>当前页面先承接站内跳转，避免继续落到控制台或文档页。</p>
                <p>后续只需要把这里的 mock 数据替换成真实接口，即可无缝转为正式模块。</p>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                Product Note
              </div>
              <div className="mt-3 text-2xl font-black tracking-[-0.03em]">
                路由已独立
              </div>
              <div className="mt-4 text-sm leading-7 text-slate-300">
                首页左侧的“定时任务”和“社区”现在分别对应独立页面，后面再接实际业务即可。
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
