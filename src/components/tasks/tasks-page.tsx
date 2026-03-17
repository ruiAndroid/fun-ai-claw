import { CalendarClock } from "lucide-react";
import { ModulePageShell } from "@/components/modules/module-page-shell";

const metrics = [
  {
    label: "待执行任务",
    value: "02",
    hint: "今晚 20:00 和 22:30 各有一个机器人例行任务",
  },
  {
    label: "刚完成",
    value: "01",
    hint: "上一条任务已在 10 分钟前完成，用于占位展示",
  },
  {
    label: "任务模板",
    value: "06",
    hint: "后续可接入真实的 cron、批量分发和运营编排",
  },
] as const;

const activities = [
  {
    title: "晚间内容分发",
    summary: "针对女频机器人做晚高峰内容推送，预留为后续真实消息投放任务。",
    meta: "今日 20:00 · 机器人矩阵",
    status: "待执行",
  },
  {
    title: "创作结果归档",
    summary: "把机器人生成内容同步进素材库，当前先作为界面占位数据展示状态流转。",
    meta: "今日 22:30 · 内容沉淀",
    status: "待执行",
  },
  {
    title: "晨间巡检",
    summary: "检查运行中的机器人实例与会话连通性，这一项刚刚执行完毕。",
    meta: "今天 09:00 · 系统巡检",
    status: "已完成",
  },
] as const;

export function TasksPage() {
  return (
    <ModulePageShell
      eyebrow="Scheduled Tasks"
      title="定时任务"
      description="这里先作为首页左侧导航的独立承接页，展示少量假数据，避免点击后继续跳到控制台。后续接入真实任务中心时，可以直接替换成正式列表与详情能力。"
      icon={CalendarClock}
      metrics={[...metrics]}
      activities={[...activities]}
      actionLabel="返回控制台"
      actionHref="/console"
    />
  );
}
