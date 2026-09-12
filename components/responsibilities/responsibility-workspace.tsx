"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, CalendarDays, FileText, FolderOpen, ListTodo, Plus, Tags, Upload } from "lucide-react";
import { DayTimeline } from "@/components/calendar/day-timeline";
import { TaskList } from "@/components/dashboard/task-list";
import { ResponsibilityColorPicker } from "@/components/responsibilities/color-picker";
import { WorkspacePanels } from "@/components/responsibilities/workspace-panels";
import { Button, ButtonLink, Card, CardHeader, EmptyState, Page, ProgressBar, Segmented, Stat, inputClass, textareaClass } from "@/components/ui/primitives";
import { useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
import { cn, formatTime } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Overview", icon: FolderOpen },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "files", label: "Files", icon: Upload },
  { id: "analytics", label: "Insights", icon: BarChart3 }
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ResponsibilityWorkspace({ responsibilityId }: { responsibilityId: string }) {
  const [tab, setTab] = useState<TabId>("overview");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [fileName, setFileName] = useState("");
  const responsibility = useAppStore((state) => state.responsibilities.find((item) => item.id === responsibilityId));
  const updateResponsibilityColor = useAppStore((state) => state.updateResponsibilityColor);
  const addNote = useAppStore((state) => state.addNote);
  const addMockFile = useAppStore((state) => state.addMockFile);
  const allTasks = useAppStore((state) => state.tasks);
  const allCalendarItems = useAppStore((state) => state.calendarItems);
  const tasks = useMemo(() => allTasks.filter((task) => task.responsibilityId === responsibilityId), [allTasks, responsibilityId]);
  const calendarItems = useMemo(() => allCalendarItems.filter((item) => item.responsibilityId === responsibilityId), [allCalendarItems, responsibilityId]);

  if (!responsibility) {
    return (
      <Page width="narrow">
        <EmptyState icon={Tags} title="Label not found" description="It may have been deleted." action={<ButtonLink href="/responsibilities" size="sm">All labels</ButtonLink>} />
      </Page>
    );
  }

  const tone = getTone(responsibility.color);
  const doneTasks = tasks.filter((task) => task.status === "done").length;
  const openTasks = tasks.length - doneTasks;
  const goalPercent = responsibility.weeklyGoalHours
    ? Math.round((responsibility.actualHoursThisWeek / responsibility.weeklyGoalHours) * 100)
    : null;

  function handleNoteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteTitle.trim() || !noteBody.trim()) {
      return;
    }
    addNote({ title: noteTitle.trim(), body: noteBody.trim(), responsibilityId });
    setNoteTitle("");
    setNoteBody("");
  }

  function handleFileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fileName.trim()) {
      return;
    }
    addMockFile({ filename: fileName.trim(), responsibilityId });
    setFileName("");
  }

  const timelineCard = (
    <Card className="flex h-[620px] flex-col overflow-hidden">
      <CardHeader title="Today" meta={responsibility.name} />
      <DayTimeline filteredResponsibilityId={responsibility.id} className="min-h-0 flex-1" />
    </Card>
  );

  const tasksCard = (
    <Card className="overflow-hidden">
      <CardHeader title="Tasks" meta={openTasks ? `${openTasks} open` : undefined} />
      <TaskList responsibilityId={responsibility.id} quickAdd />
    </Card>
  );

  return (
    <Page width="wide">
      <Link href="/responsibilities" className="-ml-2 mb-6 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] text-muted transition-colors hover:bg-hover hover:text-ink">
        <ArrowLeft className="size-4" />
        Labels
      </Link>

      <header className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="pt-1">
            <ResponsibilityColorPicker value={responsibility.color} onChange={(color) => updateResponsibilityColor(responsibility.id, color)} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">{responsibility.name}</h1>
            {responsibility.description && <p className="mt-1 max-w-2xl text-sm text-muted">{responsibility.description}</p>}
          </div>
        </div>
        <dl className="flex gap-8">
          {[
            ["Open tasks", openTasks],
            ["Calendar items", calendarItems.length],
            ["Tracked this week", `${responsibility.actualHoursThisWeek}h`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <Segmented
        label="Label sections"
        value={tab}
        onChange={setTab}
        className="mb-5"
        options={tabs.map((item) => {
          const Icon = item.icon;
          return { value: item.id, label: <><Icon className="size-3.5" />{item.label}</> };
        })}
      />

      {tab === "overview" && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          {timelineCard}
          <div className="space-y-5">
            {tasksCard}
            <Card className="p-4">
              <p className="text-[13px] text-muted">Weekly time</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
                {responsibility.actualHoursThisWeek}h
                <span className="text-sm font-normal text-muted"> of {responsibility.plannedHoursThisWeek}h planned</span>
              </p>
              {goalPercent !== null && <ProgressBar value={goalPercent} color={tone.hex} className="mt-3" />}
            </Card>
            <WorkspacePanels responsibilityId={responsibility.id} sections={["notes", "files"]} />
          </div>
        </div>
      )}

      {tab === "tasks" && tasksCard}

      {tab === "calendar" && timelineCard}

      {tab === "notes" && (
        <div className="grid items-start gap-5 lg:grid-cols-[340px_1fr]">
          <Card className="p-4">
            <p className="mb-3 text-[13px] font-semibold text-ink">New note</p>
            <form onSubmit={handleNoteSubmit} className="space-y-3">
              <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Title" aria-label="Note title" className={inputClass} />
              <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Write the context once, use it everywhere." aria-label="Note body" className={cn(textareaClass, "min-h-32 resize-none")} />
              <Button type="submit" variant="primary" className="w-full" disabled={!noteTitle.trim() || !noteBody.trim()}>
                <Plus className="size-4" />
                Add note
              </Button>
            </form>
          </Card>
          <WorkspacePanels responsibilityId={responsibility.id} sections={["notes"]} />
        </div>
      )}

      {tab === "files" && (
        <div className="grid items-start gap-5 lg:grid-cols-[340px_1fr]">
          <Card className="p-4">
            <p className="mb-3 text-[13px] font-semibold text-ink">Add a file</p>
            <form onSubmit={handleFileSubmit} className="space-y-3">
              <input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="syllabus.pdf" aria-label="File name" className={inputClass} />
              <Button type="submit" variant="primary" className="w-full" disabled={!fileName.trim()}>
                <Upload className="size-4" />
                Add file
              </Button>
            </form>
          </Card>
          <WorkspacePanels responsibilityId={responsibility.id} sections={["files"]} />
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Tasks complete" value={`${doneTasks}/${tasks.length}`} />
            <Stat label="Planned this week" value={`${responsibility.plannedHoursThisWeek}h`} />
            <Stat label="Of weekly goal" value={goalPercent !== null ? `${goalPercent}%` : "—"} detail={responsibility.weeklyGoalHours ? `${responsibility.weeklyGoalHours}h goal` : "No goal set"} />
          </div>
          <Card className="overflow-hidden">
            <CardHeader title="Calendar items" meta={calendarItems.length} />
            <div className="divide-y divide-line">
              {calendarItems.map((item) => (
                <div key={item.id} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[140px_1fr_100px] sm:items-center sm:gap-3">
                  <p className="text-xs tabular-nums text-muted">{formatTime(item.startsAt)} – {formatTime(item.endsAt)}</p>
                  <p className="truncate text-sm text-ink">{item.title}</p>
                  <span className="text-xs capitalize text-subtle sm:text-right">{item.type.replace("_", " ")}</span>
                </div>
              ))}
              {calendarItems.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-muted">Nothing on the calendar for this label.</p>}
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
}
