"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ListPlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useActiveResponsibilities, useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ListsWorkspace() {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const activeResponsibilities = useActiveResponsibilities();
  const lists = useAppStore((state) => state.lists);
  const addList = useAppStore((state) => state.addList);
  const addListItem = useAppStore((state) => state.addListItem);
  const toggleListItem = useAppStore((state) => state.toggleListItem);
  const renameList = useAppStore((state) => state.renameList);
  const deleteList = useAppStore((state) => state.deleteList);
  const deleteListItem = useAppStore((state) => state.deleteListItem);
  const [query, setQuery] = useState("");
  const [newListTitle, setNewListTitle] = useState("");
  const [newListResponsibilityId, setNewListResponsibilityId] = useState("");
  const [draftItems, setDraftItems] = useState<Record<string, string>>({});
  const [editingList, setEditingList] = useState<{ id: string; title: string; responsibilityId: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Default the new-list responsibility to the first active one once loaded
  useEffect(() => {
    if (!newListResponsibilityId && activeResponsibilities.length > 0) {
      setNewListResponsibilityId(activeResponsibilities[0].id);
    }
  }, [newListResponsibilityId, activeResponsibilities]);

  const filteredLists = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return lists;
    }
    return lists.filter((list) => {
      const responsibility = responsibilities.find((item) => item.id === list.responsibilityId);
      return `${list.title} ${responsibility?.name ?? ""} ${list.items.map((item) => item.title).join(" ")}`.toLowerCase().includes(normalized);
    });
  }, [lists, query, responsibilities]);

  function createList(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newListTitle.trim() || !newListResponsibilityId) {
      return;
    }
    addList({ title: newListTitle.trim(), responsibilityId: newListResponsibilityId });
    setNewListTitle("");
  }

  function createListItem(listId: string) {
    const title = draftItems[listId]?.trim();
    if (!title) {
      return;
    }
    addListItem({ listId, title });
    setDraftItems((state) => ({ ...state, [listId]: "" }));
  }

  function saveListEdit() {
    if (!editingList || !editingList.title.trim()) return;
    renameList(editingList.id, { title: editingList.title.trim(), responsibilityId: editingList.responsibilityId });
    setEditingList(null);
  }

  function handleDeleteList(listId: string) {
    if (deleteConfirm === listId) {
      deleteList(listId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(listId);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <form onSubmit={createList} className="rounded-lg border border-line bg-[#242528] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
            <ListPlus className="size-4 text-blue" />
            New list
          </div>
          <input
            value={newListTitle}
            onChange={(event) => setNewListTitle(event.target.value)}
            placeholder="Groceries, club ideas, packing..."
            className="mb-2 h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
          />
          <select
            value={newListResponsibilityId}
            onChange={(event) => setNewListResponsibilityId(event.target.value)}
            className="mb-3 h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-blue"
          >
            {activeResponsibilities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            disabled={!newListTitle.trim()}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue px-4 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Plus className="size-4" />
            Create list
          </button>
        </form>

        <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-[#242528] px-3 text-sm text-muted">
          <Search className="size-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search lists"
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
          />
        </label>
      </aside>

      <main className="min-w-0">
        {lists.length === 0 && (
          <div className="grid h-64 place-items-center rounded-lg border border-dashed border-line text-sm text-muted">
            No lists yet — create one on the left.
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredLists.map((list) => {
            const responsibility = responsibilities.find((item) => item.id === list.responsibilityId);
            const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
            const openItems = list.items.filter((item) => !item.done);
            const isEditing = editingList?.id === list.id;
            return (
              <section key={list.id} className="group/list flex min-h-[260px] flex-col rounded-lg border border-line bg-[#242528]">
                <div className="border-b border-line p-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        value={editingList?.title ?? ""}
                        onChange={(e) => setEditingList((s) => s && { ...s, title: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") saveListEdit(); if (e.key === "Escape") setEditingList(null); }}
                        className="h-9 w-full rounded-lg border border-line bg-paper px-2.5 text-sm text-ink outline-none focus:border-blue"
                      />
                      <select
                        value={editingList?.responsibilityId ?? ""}
                        onChange={(e) => setEditingList((s) => s && { ...s, responsibilityId: e.target.value })}
                        className="h-9 w-full rounded-lg border border-line bg-paper px-2 text-sm text-ink outline-none focus:border-blue"
                      >
                        {activeResponsibilities.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <button onClick={saveListEdit} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-blue text-xs font-medium text-white">
                          <Check className="size-3.5" /> Save
                        </button>
                        <button onClick={() => setEditingList(null)} className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:text-ink">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-medium text-ink">{list.title}</h2>
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                          <span className={cn("size-2 rounded-full", tone.dot)} />
                          {responsibility?.name ?? "Unsorted"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => { setDeleteConfirm(null); setEditingList({ id: list.id, title: list.title, responsibilityId: list.responsibilityId }); }}
                          className="grid size-7 place-items-center rounded text-muted opacity-0 transition hover:bg-line hover:text-ink group-hover/list:opacity-100"
                          title="Edit list"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteList(list.id)}
                          className={cn(
                            "grid h-7 place-items-center rounded px-1.5 transition",
                            deleteConfirm === list.id
                              ? "bg-red-500/10 text-xs text-red-400"
                              : "size-7 text-muted opacity-0 hover:bg-line hover:text-red-400 group-hover/list:opacity-100"
                          )}
                          title="Delete list"
                        >
                          {deleteConfirm === list.id ? "Confirm" : <Trash2 className="size-3.5" />}
                        </button>
                        <span className="rounded-md border border-line bg-paper px-2 py-1 text-xs text-muted">
                          {openItems.length} open
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 divide-y divide-line">
                  {list.items.map((item) => (
                    <div key={item.id} className="group/item flex items-start gap-3 px-4 py-3 text-sm text-ink transition hover:bg-line">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleListItem(list.id, item.id)}
                        className="mt-0.5 size-4 cursor-pointer rounded border-line bg-paper accent-[#4285f4]"
                      />
                      <span className={cn("min-w-0 flex-1 leading-5", item.done && "text-muted line-through")}>{item.title}</span>
                      <button
                        onClick={() => deleteListItem(list.id, item.id)}
                        className="grid size-5 shrink-0 place-items-center rounded text-muted opacity-0 transition hover:text-red-400 group-hover/item:opacity-100"
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                  {!list.items.length && <p className="px-4 py-3 text-sm text-muted">No items yet.</p>}
                </div>
                <div className="flex gap-2 border-t border-line p-3">
                  <input
                    value={draftItems[list.id] ?? ""}
                    onChange={(event) => setDraftItems((state) => ({ ...state, [list.id]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        createListItem(list.id);
                      }
                    }}
                    placeholder="Add item"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
                  />
                  <button
                    type="button"
                    onClick={() => createListItem(list.id)}
                    disabled={!draftItems[list.id]?.trim()}
                    className="grid size-10 place-items-center rounded-lg bg-paper text-muted transition hover:bg-line hover:text-ink disabled:opacity-40"
                    aria-label={`Add item to ${list.title}`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
