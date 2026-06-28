"use client";

import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, FileText, FolderOpen, ListTodo, Plus, Upload } from "lucide-react";
import { DayTimeline } from "@/components/calendar/day-timeline";
import { TaskList } from "@/components/dashboard/task-list";
import { ResponsibilityHeading } from "@/components/responsibilities/responsibility-heading";
import { ResponsibilityColorPicker } from "@/components/responsibilities/color-picker";
import { WorkspacePanels } from "@/components/responsibilities/workspace-panels";
import { Panel } from "@/components/ui/panel";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn, formatTime } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Overview", icon: FolderOpen },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "files", label: "Files", icon: Upload },
  { id: "analytics", label: "Analytics", icon: BarChart3 }
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
  const allNotes = useAppStore((state) => state.notes);
  const allFiles = useAppStore((state) => state.files);
  const tasks = useMemo(() => allTasks.filter((task) => task.responsibilityId === responsibilityId), [allTasks, responsibilityId]);
  const calendarItems = useMemo(() => allCalendarItems.filter((item) => item.responsibilityId === responsibilityId), [allCalendarItems, responsibilityId]);
  const notes = useMemo(() => allNotes.filter((note) => note.responsibilityId === responsibilityId), [allNotes, responsibilityId]);
  const files = useMemo(() => allFiles.filter((file) => file.responsibilityId === responsibilityId), [allFiles, responsibilityId]);

  if (!responsibility) {
    return null;
  }

  const tone = responsibilityTone[responsibility.color];
  const doneTasks = tasks.filter((task) => task.status === "done").length;

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

  return (
    <div className="space-y-4">
      <header className="relative overflow-visible rounded-xl border border-line bg-panel p-4 sm:p-5">
        <span className={cn("absolute inset-x-0 top-0 h-1", tone.dot)} />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <ResponsibilityHeading responsibilityId={responsibility.id} />
            <div className="mt-4 max-w-sm">
              <p className="mb-2 text-xs text-muted">Color</p>
              <ResponsibilityColorPicker value={responsibility.color} onChange={(color) => updateResponsibilityColor(responsibility.id, color)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-line bg-line p-3">
              <p className="text-2xl font-semibold text-ink">{tasks.length}</p>
              <p className="text-muted">tasks</p>
            </div>
            <div className="rounded-lg border border-line bg-line p-3">
              <p className="text-2xl font-semibold text-ink">{calendarItems.length}</p>
              <p className="text-muted">calendar</p>
            </div>
            <div className="rounded-lg border border-line bg-line p-3">
              <p className="text-2xl font-semibold text-ink">{responsibility.actualHoursThisWeek}h</p>
              <p className="text-muted">tracked</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex max-w-full overflow-x-auto rounded-lg border border-line bg-line p-1 text-sm no-scrollbar">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-muted transition hover:text-ink",
                  tab === item.id && "bg-blue text-white shadow-lift"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {tab === "overview" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel title="Filtered Calendar" eyebrow={responsibility.name}>
            <div className="p-3">
              <DayTimeline filteredResponsibilityId={responsibility.id} />
            </div>
          </Panel>
          <div className="space-y-4">
            <Panel title="Tasks" eyebrow="open loops">
              <TaskList responsibilityId={responsibility.id} quickAdd />
            </Panel>
            <Panel title="Weekly Time" eyebrow="actuals">
              <div className="p-4">
                <p className="text-3xl font-semibold text-ink">{responsibility.actualHoursThisWeek}h</p>
                <p className="text-sm text-muted">Actual against {responsibility.plannedHoursThisWeek}h planned</p>
                <div className="mt-4 h-2 rounded-full bg-line p-0.5">
                  <div className={cn("h-full rounded-full", tone.dot)} style={{ width: `${Math.min(100, (responsibility.actualHoursThisWeek / responsibility.weeklyGoalHours) * 100)}%` }} />
                </div>
              </div>
            </Panel>
            <WorkspacePanels responsibilityId={responsibility.id} />
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <Panel title="Tasks" eyebrow="simple local list">
          <TaskList responsibilityId={responsibility.id} quickAdd />
        </Panel>
      )}

      {tab === "calendar" && (
        <Panel title="Calendar" eyebrow="filtered schedule">
          <div className="p-3">
            <DayTimeline filteredResponsibilityId={responsibility.id} />
          </div>
        </Panel>
      )}

      {tab === "notes" && (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Panel title="New Note" eyebrow="local mock">
            <form onSubmit={handleNoteSubmit} className="space-y-3 p-4">
              <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Title" className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-blue" />
              <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Write the context once, use it everywhere." className="min-h-32 w-full resize-none rounded-lg border border-line bg-paper p-3 text-sm text-ink outline-none placeholder:text-muted focus:border-blue" />
              <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue text-sm font-medium text-white disabled:opacity-50" disabled={!noteTitle.trim() || !noteBody.trim()}>
                <Plus className="size-4" />
                Add note
              </button>
            </form>
          </Panel>
          <Panel title="Notes" eyebrow={`${notes.length} saved`}>
            <WorkspacePanels responsibilityId={responsibility.id} sections={["notes"]} />
          </Panel>
        </div>
      )}

      {tab === "files" && (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Panel title="Mock Upload" eyebrow="no storage yet">
            <form onSubmit={handleFileSubmit} className="space-y-3 p-4">
              <input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="syllabus.pdf" className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-blue" />
              <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue text-sm font-medium text-white disabled:opacity-50" disabled={!fileName.trim()}>
                <Upload className="size-4" />
                Add mock file
              </button>
            </form>
          </Panel>
          <Panel title="Files" eyebrow={`${files.length} saved`}>
            <WorkspacePanels responsibilityId={responsibility.id} sections={["files"]} />
          </Panel>
        </div>
      )}

      {tab === "analytics" && (
        <Panel title="Analytics" eyebrow="responsibility pulse">
          <div className="grid gap-3 p-4 md:grid-cols-3">
            <div className="rounded-lg border border-line bg-line p-4">
              <p className="text-3xl font-semibold text-ink">{doneTasks}/{tasks.length}</p>
              <p className="mt-1 text-sm text-muted">tasks complete</p>
            </div>
            <div className="rounded-lg border border-line bg-line p-4">
              <p className="text-3xl font-semibold text-ink">{responsibility.plannedHoursThisWeek}h</p>
              <p className="mt-1 text-sm text-muted">planned this week</p>
            </div>
            <div className="rounded-lg border border-line bg-line p-4">
              <p className="text-3xl font-semibold text-ink">{Math.round((responsibility.actualHoursThisWeek / responsibility.weeklyGoalHours) * 100)}%</p>
              <p className="mt-1 text-sm text-muted">of weekly goal</p>
            </div>
          </div>
          <div className="divide-y divide-line">
            {calendarItems.map((item) => (
              <div key={item.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[100px_1fr_110px] sm:items-center">
                <p className="text-xs text-muted">{formatTime(item.startsAt)} - {formatTime(item.endsAt)}</p>
                <p className="text-sm text-ink">{item.title}</p>
                <span className="rounded-md bg-paper px-2 py-1 text-center text-xs text-muted">{item.type.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
