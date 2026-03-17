import type { ConsumerMe } from "@/types/contracts";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AccountSettingsPanel({ me }: { me: ConsumerMe }) {
  const rows = [
    { label: "手机号", value: me.phoneMasked },
    { label: "UID", value: me.uid },
    { label: "昵称", value: me.nickname || me.phoneMasked },
    { label: "状态", value: me.status },
    { label: "注册时间", value: formatDateTime(me.createdAt) },
    { label: "最近登录", value: formatDateTime(me.lastLoginAt) },
  ];

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-5xl font-black tracking-[-0.05em] text-slate-950">账号与安全</h1>
        <div className="mt-8 rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <div className="space-y-8">
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid gap-3 border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center"
              >
                <div className="text-[20px] font-black tracking-[-0.03em] text-slate-950">{row.label}</div>
                <div className="text-left text-[20px] font-bold tracking-[-0.03em] text-slate-500 sm:text-right">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-4xl font-black tracking-[-0.05em] text-slate-950">第一期已开放能力</h2>
        <div className="mt-8 rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <div className="grid gap-5 text-lg font-semibold leading-8 text-slate-500">
            <div>已支持手机号验证码登录，注册登录一体化，未注册手机号验证通过后会自动创建账号。</div>
            <div>登录态使用安全 Cookie 保存，退出登录后会立即清除当前会话。</div>
            <div>虾米账单、作品列表与更多 C 端能力会在后续阶段继续接入。</div>
          </div>
        </div>
      </section>
    </div>
  );
}
