"use client";

import { useMemo, useState } from "react";
import { ListPlus, Plus, Search } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ListsWorkspace() {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const lists = useAppStore((state) => state.lists);
  const addList = useAppStore((state) => state.addList);
  const addListItem = useAppStore((state) => state.addListItem);
  const toggleListItem = useAppStore((state) => state.toggleListItem);
  const [query, setQuery] = useState("");
  const [newListTitle, setNewListTitle] = useState("");
  const [newListResponsibilityId, setNewListResponsibilityId] = useState("personal");
  const [draftItems, setDraftItems] = useState<Record<string, string>>({});

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
    if (!newListTitle.trim()) {
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
            {responsibilities.map((item) => (
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

      <main className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredLists.map((list) => {
          const responsibility = responsibilities.find((item) => item.id === list.responsibilityId);
          const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
          const openItems = list.items.filter((item) => !item.done);
          return (
            <section key={list.id} className="flex min-h-[260px] flex-col rounded-lg border border-line bg-[#242528]">
              <div className="border-b border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-medium text-ink">{list.title}</h2>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <span className={cn("size-2 rounded-full", tone.dot)} />
                      {responsibility?.name ?? "Unsorted"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-line bg-paper px-2 py-1 text-xs text-muted">
                    {openItems.length} open
                  </span>
                </div>
              </div>
              <div className="flex-1 divide-y divide-line">
                {list.items.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-start gap-3 px-4 py-3 text-sm text-ink transition hover:bg-line">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleListItem(list.id, item.id)}
                      className="mt-0.5 size-4 rounded border-line bg-paper accent-[#4285f4]"
                    />
                    <span className={cn("leading-5", item.done && "text-muted line-through")}>{item.title}</span>
                  </label>
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
      </main>
    </div>
  );
}
