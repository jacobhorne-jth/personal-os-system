import { ListsWorkspace } from "@/components/lists/lists-workspace";

export default function ListsPage() {
  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-line bg-[#242528] p-5">
        <p className="text-sm text-muted">Lists</p>
        <h1 className="mt-1 text-3xl font-normal text-ink">Simple lists for everything loose</h1>
      </header>
      <ListsWorkspace />
    </div>
  );
}
