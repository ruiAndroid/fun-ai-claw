import Link from "next/link";
import { ArrowRight, BookOpen, Network } from "lucide-react";

export function HomepageTopbar() {
  return (
    <header className="rounded-[24px] border border-white/70 bg-white/72 px-4 py-3 shadow-[0_20px_55px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-md-primary/12 bg-white/82 px-3 py-1.5 text-xs font-bold tracking-[0.18em] uppercase text-md-primary shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            FunClaw
          </div>
          <div className="hidden text-sm text-md-on-surface-variant sm:block">
            Agent × Skill 平台入口
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2.5 text-sm font-semibold text-md-on-surface shadow-sm transition-colors duration-300 hover:text-md-primary"
          >
            <BookOpen size={15} />
            文档
          </Link>
          <Link
            href="/docs/open-v1-external-frontend-integration"
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2.5 text-sm font-semibold text-md-on-surface shadow-sm transition-colors duration-300 hover:text-md-primary"
          >
            <Network size={15} />
            Open API
          </Link>
          <Link
            href="/console"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 to-teal-300 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-[0_16px_40px_rgba(45,212,191,0.24)] transition-transform duration-300 hover:scale-[1.02]"
          >
            进入控制台
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
