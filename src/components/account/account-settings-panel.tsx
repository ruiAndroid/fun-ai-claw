export function AccountSettingsPanel() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-5xl font-black tracking-[-0.05em] text-slate-950">账号与安全</h1>
        <div className="mt-8 rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <div className="grid gap-10 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
            <div className="text-[22px] font-black tracking-[-0.03em] text-slate-950">手机号</div>
            <div className="text-right text-[22px] font-black tracking-[-0.03em] text-slate-400">
              138****7014
            </div>
          </div>
          <div className="mt-12 grid gap-10 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
            <div className="text-[22px] font-black tracking-[-0.03em] text-slate-950">UID</div>
            <div className="text-right text-[22px] font-black tracking-[-0.03em] text-slate-400">
              51841239461361434
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-5xl font-black tracking-[-0.05em] text-slate-950">Agent 基础配置</h2>
          <button
            type="button"
            className="inline-flex h-16 items-center justify-center rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-14 text-[22px] font-black text-white shadow-[0_18px_40px_rgba(45,212,191,0.22)] transition-transform duration-300 hover:scale-[1.01]"
          >
            保存
          </button>
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <div className="grid gap-8">
            <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,640px)] lg:items-center">
              <label className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                怎么称呼你？
              </label>
              <input
                type="text"
                placeholder="输入你的名字"
                className="h-18 rounded-[20px] border border-slate-900/18 bg-white px-6 text-xl font-semibold text-slate-950 outline-none transition-colors duration-300 placeholder:text-slate-300 focus:border-cyan-400"
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,640px)] lg:items-center">
              <label className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                你的角色（可选）
              </label>
              <input
                type="text"
                placeholder="如：影视创作者、小说作家等"
                className="h-18 rounded-[20px] border border-slate-900/18 bg-white px-6 text-xl font-semibold text-slate-950 outline-none transition-colors duration-300 placeholder:text-slate-300 focus:border-cyan-400"
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,640px)] lg:items-center">
              <label className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                怎么称呼我？（可选）
              </label>
              <input
                type="text"
                placeholder="给 FunClaw 取个名字，比如：小橙子"
                className="h-18 rounded-[20px] border border-slate-900/18 bg-white px-6 text-xl font-semibold text-slate-950 outline-none transition-colors duration-300 placeholder:text-slate-300 focus:border-cyan-400"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
