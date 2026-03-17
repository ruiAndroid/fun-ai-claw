import Link from "next/link";
import { Plus } from "lucide-react";

export function HomepageTopbar({ points = 1000 }: { points?: number }) {
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

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold shadow-sm">
            <span className="text-cyan-400">{points}</span>
            <span className="text-md-on-surface">point</span>
          </div>
          <Link
            href="/console"
            className="inline-flex items-center gap-1.5 rounded-full bg-cyan-200 px-4 py-2 text-sm font-bold text-slate-900 shadow-[0_14px_32px_rgba(34,211,238,0.2)] transition-transform duration-300 hover:scale-[1.02]"
          >
            <Plus size={14} />
            充值
          </Link>
        </div>
      </div>
    </header>
  );
}
