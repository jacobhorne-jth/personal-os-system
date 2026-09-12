"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clipboard, FileUp, Image, Loader2, Mic, MicOff, Timer, Type, WandSparkles, X } from "lucide-react";
import { Button, Segmented, textareaClass } from "@/components/ui/primitives";
import { useActiveResponsibilities, useAppStore } from "@/lib/stores/app-store";
import { cn } from "@/lib/utils";
import { localDateKey } from "@/lib/dates";

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
  const responsibilities = useActiveResponsibilities();
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
          todayIso: localDateKey(),
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      addParsedExtraction({
        source: mode === "time_log" ? "time_log" : mode === "type" ? "typed" : (mode as "voice" | "upload" | "paste"),
        summary: data.summary,
        confidence: data.confidence,
        status: "pending_review",
        decisions: {},
        proposedTasks: data.proposedTasks,
        proposedEvents: data.proposedEvents,
        proposedNotes: data.proposedNotes,
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
      <div className="border-b border-line px-4 py-3">
        <Segmented
          label="Capture mode"
          value={mode}
          onChange={(modeId) => { setMode(modeId); setError(null); }}
          options={modes.map(({ id: modeId, label, icon: Icon }) => ({
            value: modeId,
            label: <><Icon className="size-3.5" />{label}</>,
          }))}
        />
      </div>

      <div className="grid gap-6 p-4 lg:grid-cols-[1fr_240px]">
        <div className="space-y-3">
          <p className="text-xs text-muted">{activeMode.hint}</p>

          {/* Pasted image preview */}
          {pastedImage && (
            <div className="relative overflow-hidden rounded-lg border border-line bg-paper">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <Image className="size-3.5 text-muted" />
                <span className="text-xs text-ink">Screenshot attached</span>
                <button
                  onClick={() => setPastedImage(null)}
                  aria-label="Remove screenshot"
                  className="ml-auto grid size-6 place-items-center rounded text-muted hover:bg-hover hover:text-ink"
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
              rows={pastedImage ? 3 : 9}
              className={cn(
                textareaClass,
                "resize-none p-3",
                listening && "border-accent/50 ring-2 ring-accent/10"
              )}
            />
            {listening && (
              <span className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs text-accent">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                Listening
              </span>
            )}
          </div>

          {/* Mode-specific controls */}
          <div className="flex flex-wrap items-center gap-2">
            {mode === "voice" && (
              <Button onClick={toggleVoice} className={cn(listening && "border-accent/40 text-accent")}>
                {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {listening ? "Stop recording" : "Start recording"}
              </Button>
            )}

            {mode === "upload" && (
              <>
                <input ref={fileInputRef} type="file" accept=".txt,.md,.csv" className="hidden" onChange={handleFileUpload} />
                <Button onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="size-4" />
                  Choose file
                </Button>
              </>
            )}

            {mode === "paste" && !pastedImage && (
              <p className="text-xs text-muted">Tip: ⌘V a screenshot anywhere on this page to attach it.</p>
            )}

            <Button variant="primary" onClick={handleParse} disabled={!canParse} className="ml-auto">
              {parsing ? (
                <><Loader2 className="size-4 animate-spin" /> Parsing…</>
              ) : (
                <><WandSparkles className="size-4" /> Parse for review</>
              )}
            </Button>
          </div>

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <p className="text-xs leading-5 text-muted">
            Nothing touches your tasks, calendar, or notes until you approve each proposed change in the Inbox.
          </p>
          <div>
            <p className="mb-2 text-xs font-medium text-ink">Try an example</p>
            <div className="-mx-2 space-y-0.5">
              {examples.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => { setText(ex.text); setMode("type"); setPastedImage(null); }}
                  className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-hover"
                >
                  <span className="text-xs font-medium text-ink">{ex.label}</span>
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
