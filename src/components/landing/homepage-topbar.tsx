import Link from "next/link";
import { Plus } from "lucide-react";
import { XiamiIcon } from "@/components/ui/xiami-icon";

export function HomepageTopbar({ xiamiBalance = null }: { xiamiBalance?: number | null }) {
  return (
    <header className="rounded-[24px] border border-white/70 bg-white/72 px-4 py-3 shadow-[0_20px_55px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-md-primary/12 bg-white/82 px-3 py-1.5 text-xs font-bold tracking-[0.18em] uppercase text-md-primary shadow-sm">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            FunClaw
          </div>
          <div className="hidden text-sm text-md-on-surface-variant sm:block">
            Agent × Skill 平台入口
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold shadow-sm">
            <span className="text-violet-600">{xiamiBalance ?? "--"}</span>
            <XiamiIcon size={18} />
            <span className="text-md-on-surface">虾米</span>
          </div>
          <Link
            href="/recharge"
            className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#ff8a1a_0%,#ff6b2c_45%,#9333ea_100%)] px-4 py-2 text-sm font-bold text-white shadow-[0_14px_32px_rgba(147,51,234,0.22)] transition-transform duration-300 hover:scale-[1.02]"
          >
            <Plus size={14} />
            充值
          </Link>
        </div>
      </div>
    </header>
  );
}
