"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, FileUp, Mic, Send, Timer, Type, Clipboard, WandSparkles } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

const modes = [
  { id: "type", label: "Type", icon: Type },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "upload", label: "Upload", icon: FileUp },
  { id: "paste", label: "Paste", icon: Clipboard },
  { id: "time_log", label: "Time log", icon: Timer }
];

const examples = [
  "Remind me to buy groceries tomorrow",
  "Add deodorant to grocery list",
  "Log 2-4 PM as research",
  "Research meeting Tuesday 2 PM",
  "Finish poster edits by Friday"
];

export function CaptureWorkbench() {
  const router = useRouter();
  const addCaptureExtraction = useAppStore((state) => state.addCaptureExtraction);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const [mode, setMode] = useState("type");
  const [text, setText] = useState("");
  const [responsibilityId, setResponsibilityId] = useState("digital-learning-lab");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim()) {
      return;
    }

    addCaptureExtraction({
      text,
      source: mode === "voice" ? "voice" : mode === "upload" ? "upload" : mode === "paste" ? "paste" : "typed",
      responsibilityId
    });
    setText("");
    router.push("/inbox");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="border-b border-line bg-line p-3">
        <div className="grid grid-cols-5 gap-2">
          {modes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setMode(item.id)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-[11px] transition sm:text-xs",
                  mode === item.id ? "border-blue bg-blue text-white shadow-lift" : "border-line bg-line text-muted hover:bg-[#4a4d52]"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {responsibilities.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => setResponsibilityId(item.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs transition",
                  responsibilityId === item.id
                    ? `${responsibilityTone[item.color].chip} border-transparent`
                    : "border-line bg-line text-muted hover:text-ink"
                )}
              >
                {item.name}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-h-64 w-full resize-none rounded-lg border border-line bg-paper p-4 text-sm leading-6 text-ink outline-none placeholder:text-muted focus:border-blue/60"
            placeholder="Drop the raw thing here. Messy is fine."
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <select
              value={responsibilityId}
              onChange={(event) => setResponsibilityId(event.target.value)}
              className="h-10 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none"
            >
              {responsibilities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button className="flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50" disabled={!text.trim()}>
              <Send className="size-4" />
              Parse for review
            </button>
          </div>
        </div>
        <aside className="space-y-3">
          <div className="rounded-lg bg-mint p-3 text-white">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <WandSparkles className="size-4 text-white" />
              AI safety rule
            </div>
            <p className="text-xs leading-5 text-white/90">
              Parsing creates proposed changes only. Nothing touches your calendar, tasks, notes, or logs until you approve it.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-line p-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-ink">
              <Clock className="size-4 text-blue" />
              Fast examples
            </div>
            <div className="space-y-2">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => setText(example)}
                  className="flex w-full items-start gap-2 rounded-md bg-paper p-2 text-left text-xs leading-5 text-muted transition hover:bg-line hover:text-ink"
                >
                  <Check className="mt-0.5 size-3 text-mint" />
                  {example}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
