"use client";

import Link from "next/link";
import { Apple, BarChart3, Dumbbell, Flag, Lightbulb, Repeat2, Settings, type LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";

const goals = [
  { title: "Get Ticketmaster offer", responsibilityId: "recruiting", current: 4, target: 6, unit: "interview loops", deadline: "Jul 15" },
  { title: "Hit 160g protein daily", responsibilityId: "gym", current: 132, target: 160, unit: "g avg", deadline: "This week" },
  { title: "Finish Capital One intern project", responsibilityId: "capital-one", current: 68, target: 100, unit: "%", deadline: "Aug 2" },
  { title: "Solve 150 LeetCode problems", responsibilityId: "leetcode", current: 47, target: 150, unit: "problems", deadline: "Sep 1" }
];

const habits = [
  { title: "LeetCode daily", responsibilityId: "leetcode", streak: 5, rate: 71 },
  { title: "Gym 5x/week", responsibilityId: "gym", streak: 3, rate: 60 },
  { title: "Log food daily", responsibilityId: "gym", streak: 6, rate: 86 },
  { title: "Read paper 3x/week", responsibilityId: "digital-learning-lab", streak: 2, rate: 50 }
];

const foods = [
  { name: "Chicken bowl", meal: "lunch", calories: 650, protein: 55 },
  { name: "Greek yogurt", meal: "snack", calories: 180, protein: 22 },
  { name: "Egg scramble", meal: "breakfast", calories: 420, protein: 34 }
];

function toneFor(responsibilityId: string) {
  const responsibility = useAppStore.getState().responsibilities.find((item) => item.id === responsibilityId);
  return responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.graphite;
}

function PageHeader({ eyebrow, title, icon: Icon }: { eyebrow: string; title: string; icon: LucideIcon }) {
  return (
    <header className="flex items-start justify-between gap-4 rounded-lg border border-line bg-panel p-5">
      <div>
        <p className="text-sm text-muted">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">{title}</h1>
      </div>
      <span className="grid size-11 place-items-center rounded-lg bg-line text-blue">
        <Icon className="size-5" />
      </span>
    </header>
  );
}

export function GoalsWorkspace() {
  const responsibilities = useAppStore((state) => state.responsibilities);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Goals" title="Active outcomes" icon={Flag} />
      <div className="grid gap-3 md:grid-cols-2">
        {goals.map((goal) => {
          const responsibility = responsibilities.find((item) => item.id === goal.responsibilityId);
          const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.graphite;
          const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
          return (
            <Panel key={goal.title} title={goal.title} eyebrow={responsibility?.name}>
              <div className="p-4">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-3xl font-semibold text-ink">{percent}%</p>
                  <span className="rounded-full border border-line px-2 py-1 text-xs text-muted">{goal.deadline}</span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-line p-0.5">
                  <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: tone.hex }} />
                </div>
                <p className="mt-2 text-sm text-muted">{goal.current} / {goal.target} {goal.unit}</p>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

export function HabitsWorkspace() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Habits" title="Today and weekly rhythm" icon={Repeat2} />
      <Panel title="Weekly Habit Grid" eyebrow="MVP tracker">
        <div className="divide-y divide-line">
          {habits.map((habit) => {
            const tone = toneFor(habit.responsibilityId);
            return (
              <div key={habit.title} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_120px_160px] sm:items-center">
                <p className="text-sm font-medium text-ink">{habit.title}</p>
                <p className="text-xs text-muted">{habit.streak} day streak</p>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }).map((_, index) => <span key={index} className="h-7 rounded-md border border-line" style={{ backgroundColor: index < Math.round(habit.rate / 14.3) ? tone.hex : "transparent" }} />)}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

export function GymWorkspace() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Gym" title="Workout system" icon={Dumbbell} />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel title="Current Split" eyebrow="push / pull / legs">
          <div className="grid gap-3 p-4 md:grid-cols-3">
            {["Push", "Pull", "Legs"].map((day) => <div key={day} className="rounded-lg border border-line bg-paper p-4"><p className="font-medium text-ink">{day}</p><p className="mt-1 text-sm text-muted">Bench, row, squat family movements with set logging.</p></div>)}
          </div>
        </Panel>
        <Panel title="Progress" eyebrow="this week">
          <div className="space-y-3 p-4 text-sm text-muted">
            <p><span className="text-2xl font-semibold text-ink">3</span> sessions logged</p>
            <p><span className="text-2xl font-semibold text-ink">12,450</span> lb volume</p>
            <p><span className="text-2xl font-semibold text-ink">2</span> PR candidates</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function FoodWorkspace() {
  const calories = foods.reduce((sum, item) => sum + item.calories, 0);
  const protein = foods.reduce((sum, item) => sum + item.protein, 0);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Food" title="Calories and protein" icon={Apple} />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel title="Today" eyebrow="manual log">
          <div className="grid grid-cols-2 gap-3 p-4">
            <div className="rounded-lg border border-line bg-paper p-4"><p className="text-3xl font-semibold text-ink">{calories}</p><p className="text-sm text-muted">calories</p></div>
            <div className="rounded-lg border border-line bg-paper p-4"><p className="text-3xl font-semibold text-ink">{protein}g</p><p className="text-sm text-muted">protein</p></div>
          </div>
        </Panel>
        <Panel title="Meals" eyebrow="saved today">
          <div className="divide-y divide-line">
            {foods.map((food) => <div key={food.name} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_120px_120px]"><p className="text-sm text-ink">{food.name}</p><p className="text-xs text-muted">{food.calories} cal</p><p className="text-xs text-muted">{food.protein}g protein</p></div>)}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function IdeasWorkspace() {
  const ideas = ["Personal OS mobile widgets", "Interview prep flashcards", "Research paper explainer", "Restaurant protein presets"];
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Ideas" title="Idea board" icon={Lightbulb} />
      <div className="grid gap-3 md:grid-cols-4">
        {["raw", "considering", "active", "paused"].map((status, column) => (
          <Panel key={status} title={status} eyebrow="kanban">
            <div className="space-y-2 p-3">
              {ideas.filter((_, index) => index % 4 === column).map((idea) => <div key={idea} className="rounded-lg border border-line bg-paper p-3 text-sm text-ink">{idea}</div>)}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

export function ProgressWorkspace() {
  const tasks = useAppStore((state) => state.tasks);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const complete = tasks.filter((task) => task.status === "done").length;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Progress" title="Weekly review" icon={BarChart3} />
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-line bg-panel p-4"><p className="text-3xl font-semibold text-ink">{complete}</p><p className="text-sm text-muted">tasks completed</p></div>
        <div className="rounded-lg border border-line bg-panel p-4"><p className="text-3xl font-semibold text-ink">72%</p><p className="text-sm text-muted">habit rate</p></div>
        <div className="rounded-lg border border-line bg-panel p-4"><p className="text-3xl font-semibold text-ink">3</p><p className="text-sm text-muted">gym sessions</p></div>
        <div className="rounded-lg border border-line bg-panel p-4"><p className="text-3xl font-semibold text-ink">137g</p><p className="text-sm text-muted">protein avg</p></div>
      </div>
      <Panel title="Tasks by Responsibility" eyebrow="open work">
        <div className="space-y-3 p-4">
          {responsibilities.slice(0, 8).map((responsibility) => {
            const count = tasks.filter((task) => task.responsibilityId === responsibility.id && task.status !== "done").length;
            const tone = responsibilityTone[responsibility.color];
            return (
              <div key={responsibility.id} className="grid grid-cols-[140px_1fr_32px] items-center gap-3">
                <Link href={`/responsibilities/${responsibility.id}`} className="truncate text-sm text-ink">{responsibility.name}</Link>
                <div className="h-2 rounded-full bg-line"><div className="h-full rounded-full" style={{ width: `${Math.min(100, count * 12)}%`, backgroundColor: tone.hex }} /></div>
                <span className="text-right text-xs text-muted">{count}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

export function SettingsWorkspace() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Settings" title="System preferences" icon={Settings} />
      <Panel title="MVP Configuration" eyebrow="local state">
        <div className="grid gap-3 p-4 md:grid-cols-3">
          {["Stable sidebar", "Responsibility colors", "Local mock persistence"].map((setting) => (
            <label key={setting} className="flex items-center justify-between rounded-lg border border-line bg-paper p-3 text-sm text-ink">
              {setting}
              <input type="checkbox" defaultChecked className="accent-blue" />
            </label>
          ))}
        </div>
      </Panel>
    </div>
  );
}
