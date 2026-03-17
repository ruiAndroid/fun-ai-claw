import { workItems } from "./account-data";

export function AccountWorksPanel() {
  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-5xl font-black tracking-[-0.05em] text-slate-950">我的作品</h1>
        <button
          type="button"
          className="inline-flex h-16 items-center justify-center rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-12 text-[22px] font-black text-white shadow-[0_18px_40px_rgba(45,212,191,0.22)] transition-transform duration-300 hover:scale-[1.01]"
        >
          新建作品
        </button>
      </div>

      {workItems.length > 0 ? (
        <div className="mt-10 grid gap-6 xl:grid-cols-2">
          {workItems.map((item) => (
            <article
              key={item.title}
              className="rounded-[28px] border border-slate-900/18 bg-white/58 p-7 shadow-[0_20px_50px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-[28px] font-black tracking-[-0.04em] text-slate-950">{item.title}</div>
                <span className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-black text-teal-800">
                  {item.status}
                </span>
              </div>
              <p className="mt-4 text-lg font-semibold leading-8 text-slate-500">{item.subtitle}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-8 py-12 text-center shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <div className="text-[28px] font-black tracking-[-0.04em] text-slate-950">暂无作品</div>
          <div className="mt-4 text-lg font-semibold text-slate-400">
            作品列表后续会和本平台实例、项目与外部用户中心资料做关联展示。
          </div>
        </div>
      )}
    </div>
  );
}
