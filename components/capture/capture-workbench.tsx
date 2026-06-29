"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, FileUp, Mic, Timer, Type, Clipboard, WandSparkles } from "lucide-react";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
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
  const [mode, setMode] = useState("type");
  const [text, setText] = useState("");
  const source = mode === "voice" ? "voice" : mode === "upload" ? "upload" : mode === "paste" ? "paste" : mode === "time_log" ? "time_log" : "typed";

  return (
    <div>
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
          <QuickCaptureForm
            intent="review"
            source={source}
            value={text}
            onValueChange={setText}
            multiline
            placeholder="Drop the raw thing here. Messy is fine."
            submitLabel="Parse for review"
            onComplete={() => router.push("/inbox")}
          />
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
    </div>
  );
}
