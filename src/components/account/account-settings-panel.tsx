import type { ConsumerAccount } from "@/types/consumer";
import type { UserCenterMe } from "@/types/user-center";

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

function formatUserStatus(status?: string | null) {
  if (!status) {
    return "未知";
  }
  if (status === "1") {
    return "启用";
  }
  if (status === "0") {
    return "禁用";
  }
  return status;
}

function buildUserCenterRows(profile: UserCenterMe) {
  return [
    { label: "用户 ID", value: profile.userId },
    { label: "角色类型", value: profile.userType || "暂无" },
    { label: "用户名", value: profile.nickname || "暂无" },
    { label: "手机号", value: profile.phone || profile.phoneMasked || "暂无" },
    { label: "邀请码", value: profile.invitationCode || "暂无" },
    { label: "支付系统用户 ID", value: profile.payUserId || "暂无" },
    { label: "最后登录时间", value: formatDateTime(profile.lastLoginAt) },
    { label: "账号状态", value: formatUserStatus(profile.status) },
  ];
}

function buildPlatformRows(localAccount?: ConsumerAccount | null) {
  if (!localAccount) {
    return [
      { label: "本地档案状态", value: "暂未返回" },
      { label: "绑定实例数", value: "--" },
      { label: "活跃会话数", value: "--" },
      { label: "最近同步时间", value: "--" },
    ];
  }

  return [
    { label: "本地档案状态", value: "已同步" },
    { label: "绑定实例数", value: String(localAccount.activeInstanceCount) },
    { label: "活跃会话数", value: String(localAccount.activeSessionCount) },
    { label: "最近同步时间", value: formatDateTime(localAccount.lastVerifiedAt) },
  ];
}

function InfoGrid({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="space-y-8">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid gap-3 border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 sm:grid-cols-[240px_minmax(0,1fr)] sm:items-center"
        >
          <div className="text-[20px] font-black tracking-[-0.03em] text-slate-950">{row.label}</div>
          <div className="text-left text-[20px] font-bold tracking-[-0.03em] text-slate-500 sm:text-right">
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AccountSettingsPanel({
  profile,
  localAccount,
}: {
  profile: UserCenterMe;
  localAccount?: ConsumerAccount | null;
}) {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-5xl font-black tracking-[-0.05em] text-slate-950">用户中心资料</h1>
        <div className="mt-3 text-lg font-semibold text-slate-500">
          当前页主资料来自用户中心 `current-user` 接口。
        </div>
        <div className="mt-8 rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <InfoGrid rows={buildUserCenterRows(profile)} />
        </div>
      </section>

      <section>
        <h2 className="text-4xl font-black tracking-[-0.05em] text-slate-950">平台关联状态</h2>
        <div className="mt-3 text-lg font-semibold text-slate-500">
          以下数据来自本平台业务侧，仅用于展示实例绑定、会话等补充信息。
        </div>
        <div className="mt-8 rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <InfoGrid rows={buildPlatformRows(localAccount)} />
        </div>
      </section>

      <section>
        <h2 className="text-4xl font-black tracking-[-0.05em] text-slate-950">接入说明</h2>
        <div className="mt-8 rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <div className="grid gap-5 text-lg font-semibold leading-8 text-slate-500">
            <div>登录与注册由外部用户中心统一处理，本平台不再维护独立的前台账号认证逻辑。</div>
            <div>用户中心登录成功后，会先调用本平台 `syncUserInfo` 完成本地档案同步，再返回最终登录成功。</div>
            <div>如需切换真实用户中心，请同时配置 `NEXT_PUBLIC_USER_CENTER_BASE_URL` 和后端 `CONSUMER_AUTH_BASE_URL`。</div>
          </div>
        </div>
      </section>
    </div>
  );
}
