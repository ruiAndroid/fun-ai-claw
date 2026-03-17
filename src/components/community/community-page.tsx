import { House } from "lucide-react";
import { ModulePageShell } from "@/components/modules/module-page-shell";

const metrics = [
  {
    label: "今日动态",
    value: "12",
    hint: "首页侧栏的社区数字先用它做承接，占位但可浏览",
  },
  {
    label: "精选话题",
    value: "04",
    hint: "暂时展示热门机器人玩法、Skill 分享和上新预告",
  },
  {
    label: "活跃创作者",
    value: "29",
    hint: "这里未来可以接用户中心、作品流和互动数据",
  },
] as const;

const activities = [
  {
    title: "本周热门机器人玩法",
    summary: "整理近期最受关注的机器人设定、人格配置和对话风格案例，作为社区精选内容的占位。",
    meta: "精选内容 · 编辑推荐",
    status: "精选",
  },
  {
    title: "Skill 上新预告",
    summary: "预留给第三方 Skill 上架公告、最佳实践和接入教程，目前先挂假数据占位。",
    meta: "开发者生态 · 新内容",
    status: "更新",
  },
  {
    title: "创作者灵感池",
    summary: "后续可以承接用户投稿、创作灵感征集和官方活动入口，现在先保证路由和页面结构到位。",
    meta: "社区互动 · 征集中",
    status: "征集",
  },
] as const;

export function CommunityPage() {
  return (
    <ModulePageShell
      eyebrow="Community"
      title="社区"
      description="社区页先补成一个轻量独立页面，承接首页导航跳转。现在展示的是临时假数据，后续可以继续接作品流、活动流、精选内容和创作者互动模块。"
      icon={House}
      metrics={[...metrics]}
      activities={[...activities]}
      actionLabel="查看文档"
      actionHref="/docs"
    />
  );
}
