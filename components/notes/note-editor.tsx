"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { noteLabels } from "@/components/notes/notes-workspace";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

function insertAtSelection(textarea: HTMLTextAreaElement, value: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  return {
    nextValue: `${textarea.value.slice(0, start)}${value}${textarea.value.slice(end)}`,
    nextPosition: start + value.length
  };
}

function nextBulletPrefix(line: string) {
  const bulletMatch = line.match(/^(\s*)([-*])\s+/);
  const orderedMatch = line.match(/^(\s*)(\d+)\.\s+/);
  const checkboxMatch = line.match(/^(\s*)-\s\[[ x]\]\s+/i);

  if (checkboxMatch) return `${checkboxMatch[1]}- [ ] `;
  if (orderedMatch) return `${orderedMatch[1]}${Number(orderedMatch[2]) + 1}. `;
  if (bulletMatch) return `${bulletMatch[1]}${bulletMatch[2]} `;
  return "";
}

export function NoteEditor({ noteId }: { noteId: string }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const note = useAppStore((state) => state.notes.find((item) => item.id === noteId));
  const responsibilities = useAppStore((state) => state.responsibilities);
  const updateNote = useAppStore((state) => state.updateNote);
  const markNoteOpened = useAppStore((state) => state.markNoteOpened);
  const deleteNote = useAppStore((state) => state.deleteNote);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [responsibilityId, setResponsibilityId] = useState("personal");
  const [labels, setLabels] = useState<string[]>([]);

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setBody(note.body);
    setResponsibilityId(note.responsibilityId);
    setLabels(note.labels ?? []);
  }, [note]);

  useEffect(() => {
    markNoteOpened(noteId);
  }, [markNoteOpened, noteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!note) return;
      if (
        title !== note.title ||
        body !== note.body ||
        responsibilityId !== note.responsibilityId ||
        labels.join("|") !== (note.labels ?? []).join("|")
      ) {
        updateNote(note.id, {
          title,
          body,
          responsibilityId,
          labels
        });
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [body, labels, note, responsibilityId, title, updateNote]);

  if (!note) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-line bg-panel p-6 text-sm text-muted">
        Note not found.
      </div>
    );
  }

  const responsibility = responsibilities.find((item) => item.id === responsibilityId);
  const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;

  function handleBodyKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;

    if (event.key === "Tab") {
      event.preventDefault();
      const { nextValue, nextPosition } = insertAtSelection(textarea, "  ");
      setBody(nextValue);
      window.requestAnimationFrame(() => {
        textarea.selectionStart = nextPosition;
        textarea.selectionEnd = nextPosition;
      });
    }

    if (event.key === "Enter") {
      const lineStart = textarea.value.lastIndexOf("\n", textarea.selectionStart - 1) + 1;
      const currentLine = textarea.value.slice(lineStart, textarea.selectionStart);
      const prefix = nextBulletPrefix(currentLine);

      if (!prefix) return;

      event.preventDefault();
      if (currentLine.trim().match(/^([-*]|\d+\.|- \[[ x]\])$/i)) {
        const nextValue = `${textarea.value.slice(0, lineStart)}${textarea.value.slice(textarea.selectionStart)}`;
        setBody(nextValue);
        window.requestAnimationFrame(() => {
          textarea.selectionStart = lineStart;
          textarea.selectionEnd = lineStart;
        });
        return;
      }

      const { nextValue, nextPosition } = insertAtSelection(textarea, `\n${prefix}`);
      setBody(nextValue);
      window.requestAnimationFrame(() => {
        textarea.selectionStart = nextPosition;
        textarea.selectionEnd = nextPosition;
      });
    }
  }

  function removeNote() {
    deleteNote(noteId);
    router.push("/notes");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/notes")}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm text-muted transition hover:bg-line hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          Notes
        </button>
        <button
          type="button"
          onClick={removeNote}
          className="grid size-9 place-items-center rounded-lg border border-line text-muted transition hover:border-coral hover:text-coral"
          aria-label="Delete note"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <article className="overflow-hidden rounded-lg border border-line bg-[#242528]">
        <div className={cn("h-1", tone.dot)} />
        <div className="border-b border-line px-5 py-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled"
            autoFocus
            className="w-full bg-transparent text-4xl font-semibold leading-tight text-ink outline-none placeholder:text-muted"
          />
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,220px)_minmax(0,220px)]">
            <select
              value={responsibilityId}
              onChange={(event) => setResponsibilityId(event.target.value)}
              className="h-10 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-blue"
            >
              {responsibilities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={labels[0] ?? ""}
              onChange={(event) => setLabels(event.target.value ? [event.target.value] : [])}
              className="h-10 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-blue"
            >
              <option value="">No label</option>
              {noteLabels.map((label) => (
                <option
                  key={label}
                  value={label}
                >
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleBodyKeyDown}
          placeholder="Start writing..."
          className="min-h-[62vh] w-full resize-none bg-transparent px-5 py-5 font-mono text-[15px] leading-7 text-ink outline-none placeholder:text-muted"
          spellCheck
        />
      </article>
    </div>
  );
}
