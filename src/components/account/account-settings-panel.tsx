import type { ConsumerAccount } from "@/types/consumer";

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

export function AccountSettingsPanel({ account }: { account: ConsumerAccount }) {
  const rows = [
    { label: "手机号", value: account.phoneMasked || "暂无" },
    { label: "外部用户 ID", value: account.externalUserId },
    { label: "外部 UID", value: account.externalUid || "暂无" },
    { label: "昵称", value: account.displayName || account.phoneMasked || "暂无" },
    { label: "状态", value: account.status },
    { label: "外部注册时间", value: formatDateTime(account.externalCreatedAt) },
    { label: "最近登录", value: formatDateTime(account.lastLoginAt) },
    { label: "最近同步", value: formatDateTime(account.lastVerifiedAt) },
    { label: "活跃登录会话", value: String(account.activeSessionCount) },
    { label: "已绑定实例数", value: String(account.activeInstanceCount) },
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
        <h2 className="text-4xl font-black tracking-[-0.05em] text-slate-950">接入说明</h2>
        <div className="mt-8 rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <div className="grid gap-5 text-lg font-semibold leading-8 text-slate-500">
            <div>当前页面会先使用外部用户中心 access token 完成鉴权，再由本地业务后端同步用户镜像。</div>
            <div>本地仅维护用户快照、外部鉴权会话和实例绑定关系，不再承接短信、邀请码或支付逻辑。</div>
            <div>如需切换真实用户中心，请同时配置 `NEXT_PUBLIC_USER_CENTER_BASE_URL` 和后端 `CONSUMER_AUTH_BASE_URL`。</div>
          </div>
        </div>
      </section>
    </div>
  );
}
