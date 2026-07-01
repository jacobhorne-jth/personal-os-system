"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clipboard, FileUp, Image, Loader2, Mic, MicOff, Timer, Type, WandSparkles, X } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { cn } from "@/lib/utils";

type Mode = "type" | "voice" | "paste" | "upload" | "time_log";

const modes: { id: Mode; label: string; icon: React.ElementType; hint: string }[] = [
  { id: "type",     label: "Type",     icon: Type,      hint: "Quick thought, task, or reminder" },
  { id: "voice",    label: "Voice",    icon: Mic,       hint: "Speak — transcribes automatically" },
  { id: "paste",    label: "Paste",    icon: Clipboard, hint: "Email, message, or paste a screenshot" },
  { id: "upload",   label: "Upload",   icon: FileUp,    hint: "Meeting notes doc or text file" },
  { id: "time_log", label: "Time log", icon: Timer,     hint: "Log time spent on something" },
];

const examples: { label: string; text: string }[] = [
  { label: "Quick task",     text: "Remind me to send the slides to Prof Chen by Thursday" },
  { label: "Meeting notes",  text: "Standup recap: Jake will finish auth PR by EOD. Sarah blocked on staging env. Follow up with devops tomorrow morning." },
  { label: "Email paste",    text: "From: advisor@uci.edu\nSubject: Thesis check-in\n\nHey, can we meet next Tuesday at 2pm to review your outline? Let me know if that works." },
  { label: "Time log",       text: "Worked on the DLL research poster from 1pm to 3pm today" },
  { label: "Shopping list",  text: "Need to pick up: shampoo, protein powder, paper towels, and Greek yogurt" },
];

type PastedImage = { dataUrl: string; mimeType: string };

export function CaptureWorkbench() {
  const router = useRouter();
  const responsibilities = useAppStore((s) => s.responsibilities);
  const addParsedExtraction = useAppStore((s) => s.addParsedExtraction);

  const [mode, setMode] = useState<Mode>("type");
  const [text, setText] = useState("");
  const [pastedImage, setPastedImage] = useState<PastedImage | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { return () => { recognitionRef.current?.stop(); }; }, []);

  // Global paste listener — catches Cmd+V anywhere on the page
  useEffect(() => {
    function onWindowPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setPastedImage({ dataUrl, mimeType: file.type });
        setMode("paste");
        setError(null);
      };
      reader.readAsDataURL(file);
    }
    window.addEventListener("paste", onWindowPaste);
    return () => window.removeEventListener("paste", onWindowPaste);
  }, []);

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Your browser doesn't support voice input. Try Chrome."); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (final) setText((t) => (t + " " + final).trim());
      setInterimText(interim);
    };

    rec.onerror = () => { setListening(false); setInterimText(""); };
    rec.onend = () => { setListening(false); setInterimText(""); };
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
    setError(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content.slice(0, 8000));
  }

  async function handleParse() {
    const trimmed = text.trim();
    if (!trimmed && !pastedImage || parsing) return;

    setParsing(true);
    setError(null);

    try {
      const res = await fetch("/api/capture/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed || "(see attached image)",
          source: mode,
          imageBase64: pastedImage ? pastedImage.dataUrl.split(",")[1] : undefined,
          imageMimeType: pastedImage?.mimeType,
          responsibilities: responsibilities.map((r) => ({ id: r.id, name: r.name, description: r.description })),
          currentDate: new Date().toLocaleString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
            hour: "numeric", minute: "2-digit", timeZoneName: "short",
          }),
          todayIso: new Date().toISOString().slice(0, 10),
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      addParsedExtraction({
        source: mode === "time_log" ? "time_log" : mode as "typed" | "voice" | "upload" | "paste",
        summary: data.summary,
        confidence: data.confidence,
        status: "pending_review",
        decisions: {},
        proposedTasks: data.proposedTasks,
        proposedEvents: data.proposedEvents,
        proposedNotes: data.proposedNotes,
        proposedListItems: data.proposedListItems,
      });

      setText("");
      setPastedImage(null);
      router.push("/inbox");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setParsing(false);
    }
  }

  const displayText = text + (interimText ? ` ${interimText}` : "");
  const activeMode = modes.find((m) => m.id === mode)!;
  const canParse = (text.trim().length > 0 || pastedImage !== null) && !parsing;

  return (
    <div>
      {/* Mode tabs */}
      <div className="border-b border-line bg-line p-3">
        <div className="grid grid-cols-5 gap-2">
          {modes.map(({ id: modeId, label, icon: Icon }) => (
            <button
              key={modeId}
              onClick={() => { setMode(modeId); setError(null); }}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-[11px] transition sm:text-xs",
                mode === modeId
                  ? "border-blue bg-blue text-white shadow-lift"
                  : "border-line bg-line text-muted hover:bg-[#4a4d52]"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <p className="text-xs text-muted">{activeMode.hint}</p>

          {/* Pasted image preview */}
          {pastedImage && (
            <div className="relative overflow-hidden rounded-lg border border-blue/40 bg-line">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <Image className="size-3.5 text-blue" />
                <span className="text-xs text-blue">Screenshot attached</span>
                <button
                  onClick={() => setPastedImage(null)}
                  className="ml-auto rounded p-0.5 text-muted hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pastedImage.dataUrl}
                alt="Pasted screenshot"
                className="max-h-48 w-full object-contain p-2"
              />
            </div>
          )}

          {/* Main text area */}
          <div className="relative">
            <textarea
              value={mode === "voice" ? displayText : text}
              onChange={(e) => { if (mode !== "voice") setText(e.target.value); }}
              readOnly={mode === "voice"}
              placeholder={
                pastedImage
                  ? "Add context (optional) — e.g. \"respond to this later\""
                  : mode === "voice" ? "Click the mic button and speak…"
                  : mode === "paste" ? "Paste text or screenshot (Cmd+V) here…"
                  : mode === "upload" ? "File contents will appear here after upload…"
                  : mode === "time_log" ? "e.g. Worked on DLL poster from 1pm–3pm today"
                  : "What's on your mind? Messy is fine."
              }
              rows={pastedImage ? 3 : 8}
              className={cn(
                "w-full resize-none rounded-lg border bg-paper p-3 text-sm leading-6 text-ink outline-none placeholder:text-muted",
                listening ? "border-blue" : "border-line focus:border-blue/60"
              )}
            />
            {listening && (
              <span className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs text-blue">
                <span className="size-1.5 animate-pulse rounded-full bg-blue" />
                listening
              </span>
            )}
          </div>

          {/* Mode-specific controls */}
          <div className="flex items-center gap-2">
            {mode === "voice" && (
              <button
                onClick={toggleVoice}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition",
                  listening ? "border-blue bg-blue/10 text-blue" : "border-line bg-paper text-ink hover:bg-panel"
                )}
              >
                {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {listening ? "Stop recording" : "Start recording"}
              </button>
            )}

            {mode === "upload" && (
              <>
                <input ref={fileInputRef} type="file" accept=".txt,.md,.csv" className="hidden" onChange={handleFileUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-line bg-paper px-4 py-2 text-sm text-ink hover:bg-panel"
                >
                  <FileUp className="size-4" />
                  Choose file
                </button>
              </>
            )}

            {mode === "paste" && !pastedImage && (
              <p className="text-xs text-muted">Tip: Cmd+V a screenshot anywhere on this page to attach it</p>
            )}

            <button
              onClick={handleParse}
              disabled={!canParse}
              className="ml-auto flex items-center gap-2 rounded-lg bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-40"
            >
              {parsing ? (
                <><Loader2 className="size-4 animate-spin" /> Parsing…</>
              ) : (
                <><WandSparkles className="size-4" /> Parse for review</>
              )}
            </button>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-3">
          <div className="rounded-lg bg-mint p-3 text-white">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <WandSparkles className="size-4" />
              Review before committing
            </div>
            <p className="text-xs leading-5 text-white/90">
              Nothing touches your tasks, calendar, or notes until you approve each proposed change.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-line p-3">
            <p className="mb-2 text-xs font-medium text-muted">Try an example</p>
            <div className="space-y-1.5">
              {examples.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => { setText(ex.text); setMode("type"); setPastedImage(null); }}
                  className="flex w-full flex-col gap-0.5 rounded-md bg-paper px-2.5 py-2 text-left transition hover:bg-[#303134]"
                >
                  <span className="text-[10px] font-medium text-blue">{ex.label}</span>
                  <span className="line-clamp-2 text-xs leading-4 text-muted">{ex.text}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
