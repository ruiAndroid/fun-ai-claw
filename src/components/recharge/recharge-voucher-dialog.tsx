"use client";

import { X } from "lucide-react";

export function RechargeVoucherDialog({
  open,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-[620px] rounded-[28px] bg-white px-8 py-7 shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[28px] font-black tracking-[-0.04em] text-slate-950">
            代金券兑换
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-900 transition hover:bg-slate-100"
            aria-label="关闭代金券弹窗"
          >
            <X size={26} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-9">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="请输入兑换码"
            className="h-16 w-full rounded-[14px] border-2 border-slate-900/18 px-6 text-[20px] font-bold text-slate-950 outline-none transition-colors duration-300 placeholder:text-slate-400 focus:border-violet-400"
          />
        </div>

        <button
          type="button"
          className="mx-auto mt-10 inline-flex h-16 min-w-[280px] items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff8a1a_0%,#ff6b2c_42%,#9333ea_100%)] px-8 text-[24px] font-black text-white shadow-[0_18px_40px_rgba(147,51,234,0.24)] transition-transform duration-300 hover:scale-[1.01]"
        >
          确认兑换
        </button>
      </div>
    </div>
  );
}
