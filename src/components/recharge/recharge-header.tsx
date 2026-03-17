"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export function RechargeHeader() {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="w-[72px] shrink-0" />

      <div className="text-center">
        <h1 className="text-[40px] font-black tracking-[-0.05em] text-slate-950 sm:text-[52px]">
          充值服务
        </h1>
      </div>

      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-slate-900 bg-white text-slate-900 transition-transform duration-300 hover:scale-105"
        aria-label="关闭充值页"
      >
        <X size={26} strokeWidth={2.5} />
      </button>
    </header>
  );
}
