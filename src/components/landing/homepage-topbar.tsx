import Link from "next/link";
import { Plus } from "lucide-react";
import { XiamiIcon } from "@/components/ui/xiami-icon";

export function HomepageTopbar({
  rechargeHref = "/login",
  xiamiBalanceLabel = "--",
}: {
  rechargeHref?: string;
  xiamiBalanceLabel?: string | number | null;
}) {
  return (
    <header className="rounded-[24px] border border-white/70 bg-white/74 px-4 py-3 shadow-[0_20px_55px_rgba(81,38,145,0.08)] backdrop-blur-xl sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-md-primary/15 bg-white/84 px-3 py-1.5 text-xs font-bold tracking-[0.18em] uppercase text-md-primary shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#8b3dff_100%)]" />
            FunClaw
          </div>
          <div className="hidden text-sm text-md-on-surface-variant sm:block">
            Agent × Skill 平台入口
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/82 px-3 py-2 text-sm font-semibold shadow-[0_10px_24px_rgba(81,38,145,0.08)]">
            <span className="bg-[linear-gradient(135deg,#ff7a18_0%,#8b3dff_100%)] bg-clip-text text-transparent">
              {xiamiBalanceLabel ?? "--"}
            </span>
            <XiamiIcon size={18} />
            <span className="text-md-on-surface">虾米</span>
          </div>
          <Link
            href={rechargeHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] px-4 py-2 text-sm font-bold text-white shadow-[0_14px_32px_rgba(139,61,255,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(139,61,255,0.24)]"
          >
            <Plus size={14} />
            充值
          </Link>
        </div>
      </div>
    </header>
  );
}
