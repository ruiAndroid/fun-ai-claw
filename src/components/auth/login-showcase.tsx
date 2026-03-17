import { Bot, ChartNoAxesCombined, Clapperboard, SendHorizonal } from "lucide-react";

const showcaseItems = [
  {
    icon: Clapperboard,
    title: "创作层",
    description: "脚本生成、分镜制作、角色管理与实例协同统一承载。",
  },
  {
    icon: SendHorizonal,
    title: "分发层",
    description: "多平台投放、互动触达与内容编排能力逐步接入。",
  },
  {
    icon: ChartNoAxesCombined,
    title: "增长层",
    description: "数据分析、积分体系与用户运营能力后续会继续完善。",
  },
] as const;

export function LoginShowcase() {
  return (
    <section className="rounded-[32px] border border-white/55 bg-white/42 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-10">
      <div className="flex items-center gap-5 text-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-orange-400 via-orange-500 to-violet-500 text-white shadow-[0_14px_32px_rgba(147,51,234,0.28)]">
            <Bot size={28} />
          </div>
          <div className="text-4xl font-black tracking-[-0.04em]">FunClaw</div>
        </div>
      </div>

      <h2 className="mt-18 text-5xl font-black tracking-[-0.05em] text-slate-950 sm:text-6xl">
        让内容流动更简单
      </h2>

      <div className="mt-18 rounded-[28px] bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] p-6 text-white shadow-[0_28px_70px_rgba(139,61,255,0.28)]">
        <div className="text-center text-xl font-black tracking-[-0.03em] sm:text-[32px]">
          搭载多个专用Skills的智能体平台
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {showcaseItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/18 bg-white/8 px-5 py-6 backdrop-blur-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/14">
                  <Icon size={24} />
                </div>
                <div className="mt-5 text-3xl font-black tracking-[-0.04em]">{item.title}</div>
                <div className="mt-3 text-sm font-medium leading-7 text-white/86">{item.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
