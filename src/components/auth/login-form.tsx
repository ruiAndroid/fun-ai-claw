import Link from "next/link";

export function LoginForm() {
  return (
    <section className="rounded-[32px] border border-white/55 bg-white/48 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-10">
      <div className="max-w-[460px]">
        <h1 className="text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">登录</h1>
        <p className="mt-3 text-lg font-semibold text-slate-400">未注册用户将会自动进行注册</p>

        <form className="mt-12 space-y-6">
          <div>
            <label className="mb-3 block text-base font-bold text-slate-950">手机号</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="请输入手机号"
              className="h-18 w-full rounded-[22px] border border-slate-900/18 bg-white/42 px-5 py-4 text-base font-medium text-slate-900 outline-none transition-colors duration-300 placeholder:text-slate-400 focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-3 block text-base font-bold text-slate-950">验证码</label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
              <input
                type="text"
                inputMode="numeric"
                placeholder="请输入验证码"
                className="h-18 w-full rounded-[22px] border border-slate-900/18 bg-white/42 px-5 py-4 text-base font-medium text-slate-900 outline-none transition-colors duration-300 placeholder:text-slate-400 focus:border-cyan-400"
              />
              <button
                type="button"
                className="h-18 rounded-[22px] bg-cyan-200 px-5 py-4 text-base font-black text-teal-800 transition-transform duration-300 hover:scale-[1.01]"
              >
                获取验证码
              </button>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-base font-bold text-slate-950">邀请码</label>
            <input
              type="text"
              placeholder="内测阶段，需填写邀请码进行注册"
              className="h-18 w-full rounded-[22px] border border-slate-900/18 bg-white/42 px-5 py-4 text-base font-medium text-slate-900 outline-none transition-colors duration-300 placeholder:text-slate-400 focus:border-cyan-400"
            />
          </div>

          <button
            type="button"
            className="h-18 w-full rounded-[22px] bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-6 py-4 text-xl font-black text-white shadow-[0_24px_48px_rgba(45,212,191,0.28)] transition-transform duration-300 hover:scale-[1.01]"
          >
            登录
          </button>

          <label className="flex items-start gap-3 text-sm leading-6 text-slate-500">
            <input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300" />
            <span>
              已阅读并同意
              <Link href="/docs" className="mx-1 font-bold text-cyan-500 hover:text-cyan-600">
                《用户协议》
              </Link>
              和
              <Link href="/docs" className="mx-1 font-bold text-cyan-500 hover:text-cyan-600">
                《隐私政策》
              </Link>
              ，如您手机号未注册，点击登录即视为授权系统自动创建新账号。
            </span>
          </label>
        </form>
      </div>
    </section>
  );
}
