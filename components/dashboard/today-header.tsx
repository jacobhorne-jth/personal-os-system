import Link from "next/link";
import { CalendarCheck2, CheckCircle2, Clock3, Sparkles } from "lucide-react";

const stats = [
  { label: "events", value: "3", detail: "today", icon: CalendarCheck2, tone: "text-blue" },
  { label: "tasks", value: "5", detail: "due", icon: CheckCircle2, tone: "text-mint" },
  { label: "focus", value: "2.5h", detail: "planned", icon: Clock3, tone: "text-amber" }
];

export function TodayHeader() {
  return (
    <header className="mb-5 overflow-hidden rounded-xl border border-line bg-panel shadow-glow backdrop-blur-xl">
      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1fr_520px] xl:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-line px-2.5 py-1 text-xs text-muted">
            <span className="size-1.5 rounded-full bg-mint" />
            Thursday, May 7
          </div>
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Good morning Jacob</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Your day is anchored by research, algorithms, and one recruiting prep block. The calendar is the plan, the timer is the truth.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.label} href={stat.label === "events" ? "/calendar" : stat.label === "tasks" ? "/responsibilities" : "/analytics"} className="rounded-lg border border-line bg-line p-3 transition hover:border-muted hover:bg-[#4a4d52]">
                <div className="flex items-center justify-between">
                  <Icon className={`size-4 ${stat.tone}`} />
                  <Sparkles className="size-3 text-white/[0.22]" />
                </div>
                <p className="mt-4 text-2xl font-semibold text-ink">{stat.value}</p>
                <p className="text-xs text-muted">{stat.label} {stat.detail}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
