"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";

function insertAtSelection(textarea: HTMLTextAreaElement, value: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  return {
    nextValue: `${textarea.value.slice(0, start)}${value}${textarea.value.slice(end)}`,
    nextPosition: start + value.length
  };
}

function nextBulletPrefix(line: string) {
  const bulletMatch = line.match(/^(\s*)([-*•])\s+/);
  const orderedMatch = line.match(/^(\s*)(\d+)\.\s+/);
  const checkboxMatch = line.match(/^(\s*)-\s\[[ x]\]\s+/i);

  if (checkboxMatch) return `${checkboxMatch[1]}- [ ] `;
  if (orderedMatch) return `${orderedMatch[1]}${Number(orderedMatch[2]) + 1}. `;
  if (bulletMatch) return `${bulletMatch[1]}• `;
  return "";
}

function convertMarkdownShortcut(textarea: HTMLTextAreaElement) {
  const lineStart = textarea.value.lastIndexOf("\n", textarea.selectionStart - 1) + 1;
  const currentLine = textarea.value.slice(lineStart, textarea.selectionStart);
  const unorderedMatch = currentLine.match(/^(\s*)[-*]$/);

  if (!unorderedMatch) {
    return null;
  }

  const replacement = `${unorderedMatch[1]}• `;
  return {
    nextValue: `${textarea.value.slice(0, lineStart)}${replacement}${textarea.value.slice(textarea.selectionStart)}`,
    nextPosition: lineStart + replacement.length
  };
}

export function NoteEditor({ noteId }: { noteId: string }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const note = useAppStore((state) => state.notes.find((item) => item.id === noteId));
  const updateNote = useAppStore((state) => state.updateNote);
  const markNoteOpened = useAppStore((state) => state.markNoteOpened);
  const deleteNote = useAppStore((state) => state.deleteNote);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setBody(note.body);
  }, [note]);

  useEffect(() => {
    markNoteOpened(noteId);
  }, [markNoteOpened, noteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!note) return;
      if (title !== note.title || body !== note.body) {
        updateNote(note.id, {
          title,
          body
        });
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [body, note, title, updateNote]);

  if (!note) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-line bg-panel p-6 text-sm text-muted">
        Note not found.
      </div>
    );
  }

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

    if (event.key === " ") {
      const shortcut = convertMarkdownShortcut(textarea);
      if (shortcut) {
        event.preventDefault();
        setBody(shortcut.nextValue);
        window.requestAnimationFrame(() => {
          textarea.selectionStart = shortcut.nextPosition;
          textarea.selectionEnd = shortcut.nextPosition;
        });
      }
    }

    if (event.key === "Enter") {
      const lineStart = textarea.value.lastIndexOf("\n", textarea.selectionStart - 1) + 1;
      const currentLine = textarea.value.slice(lineStart, textarea.selectionStart);
      const prefix = nextBulletPrefix(currentLine);

      if (!prefix) return;

      event.preventDefault();
      if (currentLine.trim().match(/^([-*•]|\d+\.|- \[[ x]\])$/i)) {
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
    <div className="min-h-[calc(100dvh-96px)] bg-[#242528] px-6 py-4 sm:px-10 lg:px-14">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/notes")}
          className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted transition hover:bg-line hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          Notes
        </button>
        <button
          type="button"
          onClick={removeNote}
          className="grid size-8 place-items-center rounded-md text-muted transition hover:bg-line hover:text-coral"
          aria-label="Delete note"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <article className="mx-auto max-w-5xl">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="New page"
          autoFocus
          className="mb-5 w-full bg-transparent font-sans text-5xl font-semibold leading-tight text-ink outline-none placeholder:text-muted/35"
        />
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleBodyKeyDown}
          placeholder="Start writing..."
          className="min-h-[68vh] w-full resize-none bg-transparent font-sans text-[16px] leading-7 text-ink outline-none placeholder:text-muted/55"
          spellCheck
        />
      </article>
    </div>
  );
}
