"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { ButtonLink, EmptyState, Page, iconButtonClass } from "@/components/ui/primitives";
import { noteLabels } from "@/lib/note-labels";
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

// noteIds with a mounted editor; consulted by the deferred blank-note cleanup
const openNoteEditors = new Set<string>();

export function NoteEditor({ noteId }: { noteId: string }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const note = useAppStore((state) => state.notes.find((item) => item.id === noteId));
  const noteFolders = useAppStore((state) => state.noteFolders);
  const updateNote = useAppStore((state) => state.updateNote);
  const markNoteOpened = useAppStore((state) => state.markNoteOpened);
  const deleteNote = useAppStore((state) => state.deleteNote);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [label, setLabel] = useState("none");
  const [folderId, setFolderId] = useState("none");

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setBody(note.body);
    setLabel(note.labels?.[0] ?? "none");
    setFolderId(note.folderId ?? "none");
  }, [note]);

  useEffect(() => {
    markNoteOpened(noteId);
  }, [markNoteOpened, noteId]);

  // Discard the note if the user leaves without writing anything —
  // otherwise "New" + back litters the list with untitled empty notes.
  // Deletion is deferred a tick and skipped if an editor for the same note
  // mounts again, so StrictMode's mount→cleanup→mount doesn't nuke new notes.
  const emptinessRef = useRef({ empty: true, noteId });
  emptinessRef.current = { empty: !title.trim() && !body.trim(), noteId };
  useEffect(() => {
    openNoteEditors.add(noteId);
    return () => {
      openNoteEditors.delete(noteId);
      const { empty, noteId: leavingId } = emptinessRef.current;
      window.setTimeout(() => {
        if (openNoteEditors.has(leavingId)) return;
        const stored = useAppStore.getState().notes.find((n) => n.id === leavingId);
        if (empty && stored && !stored.title.trim() && !stored.body.trim()) {
          deleteNote(leavingId);
        }
      }, 60);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!note) return;
      const nextLabels = label === "none" ? [] : [label];
      const currentLabel = note.labels?.[0] ?? "none";
      const currentFolderId = note.folderId ?? "none";
      if (title !== note.title || body !== note.body || label !== currentLabel || folderId !== currentFolderId) {
        updateNote(note.id, {
          title,
          body,
          folderId: folderId === "none" ? "" : folderId,
          labels: nextLabels
        });
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [body, folderId, label, note, title, updateNote]);

  if (!note) {
    return (
      <Page width="narrow">
        <EmptyState icon={FileText} title="Note not found" description="It may have been deleted." action={<ButtonLink href="/notes" size="sm">Back to notes</ButtonLink>} />
      </Page>
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

  const edited = note.updatedAt ?? note.createdAt;
  const metaSelect =
    "h-7 cursor-pointer rounded-md bg-transparent px-1.5 text-xs text-muted outline-none transition-colors hover:bg-hover hover:text-ink focus:bg-hover";

  return (
    <Page width="narrow" className="lg:pt-6">
      <div className="mb-10 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/notes")}
          className="-ml-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] text-muted transition-colors hover:bg-hover hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          Notes
        </button>
        <div className="flex items-center gap-1">
          <select value={folderId} onChange={(event) => setFolderId(event.target.value)} className={metaSelect} aria-label="Note folder">
            <option value="none">Unfiled</option>
            {noteFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <select value={label} onChange={(event) => setLabel(event.target.value)} className={metaSelect} aria-label="Note label">
            <option value="none">No label</option>
            {noteLabels.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={removeNote}
            className={iconButtonClass("hover:text-danger")}
            aria-label={`Delete ${title.trim() || "untitled note"}`}
            title="Delete note"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <article>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Untitled"
          autoFocus
          aria-label="Note title"
          className="w-full bg-transparent text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink outline-none placeholder:text-subtle/60"
        />
        <p className="mt-2 text-xs text-subtle">
          Edited {new Date(edited).toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleBodyKeyDown}
          placeholder="Start writing…"
          aria-label="Note body"
          className="mt-6 min-h-[65vh] w-full resize-none bg-transparent text-[15px] leading-7 text-ink outline-none placeholder:text-subtle"
          spellCheck
        />
      </article>
    </Page>
  );
}
