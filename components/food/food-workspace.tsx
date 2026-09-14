"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Utensils } from "lucide-react";
import { Button, Card, CardHeader, EmptyState, Field, Page, PageHeader, ProgressBar, iconButtonClass, inputClass } from "@/components/ui/primitives";
import { useAppStore } from "@/lib/stores/app-store";
import { cn } from "@/lib/utils";
import { localDateKey } from "@/lib/dates";

type AddState = {
  name: string;
  calories: string;
  protein: string;
};

function todayStr() {
  return localDateKey();
}

function formatDate(dateStr: string) {
  const today = todayStr();
  if (dateStr === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === localDateKey(yesterday)) return "Yesterday";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function MacroSummary({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}) {
  const pct = target > 0 ? (value / target) * 100 : 0;
  const remaining = Math.max(0, target - value);
  return (
    <div className="px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] text-muted">{label}</p>
        <p className="text-xs tabular-nums text-subtle">{remaining > 0 ? `${remaining.toLocaleString()}${unit} left` : "Target hit"}</p>
      </div>
      <p className="mt-1 text-[26px] font-semibold tabular-nums tracking-[-0.01em] text-ink">
        {value.toLocaleString()}
        <span className="text-sm font-normal text-muted"> / {target.toLocaleString()}{unit}</span>
      </p>
      <ProgressBar value={pct} color={color} className="mt-3" />
    </div>
  );
}

export function FoodWorkspace() {
  const foodEntries = useAppStore((s) => s.foodEntries);
  const foodTargets = useAppStore((s) => s.foodTargets);
  const addFoodEntry = useAppStore((s) => s.addFoodEntry);
  const deleteFoodEntry = useAppStore((s) => s.deleteFoodEntry);
  const setFoodTargets = useAppStore((s) => s.setFoodTargets);
  const savedFoods = useAppStore((s) => s.savedFoods);
  const addSavedFood = useAppStore((s) => s.addSavedFood);
  const deleteSavedFood = useAppStore((s) => s.deleteSavedFood);

  const [dateOffset, setDateOffset] = useState(0);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AddState>({ name: "", calories: "", protein: "" });
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  const libraryMatches = useMemo(() => {
    const q = form.name.trim().toLowerCase();
    const pool = q ? savedFoods.filter((f) => f.name.toLowerCase().includes(q)) : savedFoods;
    return pool.slice(0, 6);
  }, [form.name, savedFoods]);

  const today = todayStr();
  const viewDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return localDateKey(d);
  }, [dateOffset]);

  const dayEntries = useMemo(
    () => foodEntries.filter((e) => e.date === viewDate),
    [foodEntries, viewDate]
  );

  const totalCalories = dayEntries.reduce((s, e) => s + e.calories, 0);
  const totalProtein = dayEntries.reduce((s, e) => s + e.protein, 0);

  function openAdd() {
    setForm({ name: "", calories: "", protein: "" });
    setSaveToLibrary(false);
    setAdding(true);
  }

  function submitEntry() {
    if (!form.name.trim()) return;
    const calories = form.calories ? Math.round(parseFloat(form.calories)) || 0 : 0;
    const protein = form.protein ? parseFloat(form.protein) || 0 : 0;
    addFoodEntry({
      date: viewDate,
      name: form.name.trim(),
      meal: "meal",
      calories,
      protein,
    });
    if (saveToLibrary) {
      addSavedFood({ name: form.name.trim(), calories, protein });
    }
    setForm({ name: "", calories: "", protein: "" });
    setSaveToLibrary(false);
    setAdding(false);
  }

  function logSavedFood(foodId: string) {
    const food = savedFoods.find((f) => f.id === foodId);
    if (!food) return;
    addFoodEntry({
      date: viewDate,
      name: food.name,
      meal: "meal",
      calories: food.calories,
      protein: food.protein,
    });
    setForm({ name: "", calories: "", protein: "" });
    setSaveToLibrary(false);
    setAdding(false);
  }

  return (
    <Page>
      <PageHeader
        title="Food"
        description={formatDate(viewDate) === "Today" ? "What you've eaten today" : formatDate(viewDate)}
        actions={
          <div className="flex items-center gap-1">
            <button onClick={() => setDateOffset((o) => o - 1)} className={iconButtonClass()} aria-label="Previous day">
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[88px] text-center text-[13px] font-medium text-ink">{formatDate(viewDate)}</span>
            <button onClick={() => setDateOffset((o) => o + 1)} disabled={viewDate >= today} className={iconButtonClass()} aria-label="Next day">
              <ChevronRight className="size-4" />
            </button>
          </div>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <Card className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <MacroSummary label="Protein" value={totalProtein} target={foodTargets.protein} unit="g" color="rgb(var(--color-success))" />
            <MacroSummary label="Calories" value={totalCalories} target={foodTargets.calories} unit="" color="rgb(var(--color-accent))" />
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Meals"
              meta={dayEntries.length ? `${dayEntries.length} logged` : undefined}
              actions={
                !adding && (
                  <Button size="sm" variant="ghost" onClick={openAdd}>
                    <Plus className="size-3.5" />
                    Add meal
                  </Button>
                )
              }
            />

            {dayEntries.length > 0 && (
              <div className="divide-y divide-line">
                {dayEntries.map((entry) => (
                  <div key={entry.id} className="group flex items-center gap-4 px-4 py-2.5">
                    <p className="min-w-0 flex-1 truncate text-sm text-ink">{entry.name}</p>
                    <span className="shrink-0 text-xs tabular-nums text-muted">{entry.calories} cal</span>
                    <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-success">{entry.protein}g</span>
                    <button
                      onClick={() => deleteFoodEntry(entry.id)}
                      title={`Delete ${entry.name}`}
                      aria-label={`Delete ${entry.name}`}
                      className={iconButtonClass("size-7 hover:text-danger lg:opacity-0 lg:group-hover:opacity-100")}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {adding && (
              <div className="border-t border-line bg-paper/60 p-4">
                {libraryMatches.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1.5 text-xs font-medium text-muted">From your library</p>
                    <div className="overflow-hidden rounded-lg border border-line bg-panel">
                      {libraryMatches.map((food) => (
                        <div key={food.id} className="group/lib flex items-center border-b border-line last:border-b-0">
                          <button
                            type="button"
                            onClick={() => logSavedFood(food.id)}
                            title={`Log ${food.name}`}
                            aria-label={`Log ${food.name}`}
                            className="flex min-w-0 flex-1 items-baseline justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-hover/60"
                          >
                            <span className="truncate text-sm text-ink">{food.name}</span>
                            <span className="shrink-0 text-xs tabular-nums text-muted">{food.calories} cal · {food.protein}g</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSavedFood(food.id)}
                            title={`Remove ${food.name} from library`}
                            aria-label={`Remove ${food.name} from library`}
                            className={iconButtonClass("mr-1 size-7 hover:text-danger lg:opacity-0 lg:group-hover/lib:opacity-100")}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-[1fr_96px_96px]">
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitEntry(); if (e.key === "Escape") setAdding(false); }}
                    placeholder="Search library or type a meal"
                    aria-label="Meal name"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    value={form.calories}
                    onChange={(e) => setForm((s) => ({ ...s, calories: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitEntry(); if (e.key === "Escape") setAdding(false); }}
                    placeholder="Calories"
                    aria-label="Calories"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.protein}
                    onChange={(e) => setForm((s) => ({ ...s, protein: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitEntry(); if (e.key === "Escape") setAdding(false); }}
                    placeholder="Protein g"
                    aria-label="Protein grams"
                    className={inputClass}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted hover:text-ink">
                    <input
                      type="checkbox"
                      checked={saveToLibrary}
                      onChange={(e) => setSaveToLibrary(e.target.checked)}
                      className="size-3.5 accent-[rgb(var(--color-ink))]"
                    />
                    Save to library
                  </label>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                    <Button size="sm" variant="primary" onClick={submitEntry} disabled={!form.name.trim()}>Add meal</Button>
                  </div>
                </div>
              </div>
            )}

            {dayEntries.length === 0 && !adding && (
              <EmptyState
                icon={Utensils}
                title="No meals logged"
                description={formatDate(viewDate) === "Today" ? "Log what you eat to track protein and calories." : "Nothing was logged this day."}
                action={<Button size="sm" variant="primary" onClick={openAdd}><Plus className="size-3.5" />Add meal</Button>}
              />
            )}
          </Card>
        </div>

        <Card className="p-4">
          <p className="text-[13px] font-semibold text-ink">Daily targets</p>
          <div className="mt-3 grid gap-3">
            <Field label="Protein (g)">
              <input
                type="number"
                min={50}
                max={400}
                value={foodTargets.protein}
                onChange={(e) => setFoodTargets({ protein: Math.max(50, parseInt(e.target.value) || 160) })}
                className={cn(inputClass, "tabular-nums")}
              />
            </Field>
            <Field label="Calories">
              <input
                type="number"
                min={1000}
                max={6000}
                step={50}
                value={foodTargets.calories}
                onChange={(e) => setFoodTargets({ calories: Math.max(1000, parseInt(e.target.value) || 2500) })}
                className={cn(inputClass, "tabular-nums")}
              />
            </Field>
          </div>
          {savedFoods.length > 0 && (
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{savedFoods.length} {savedFoods.length === 1 ? "food" : "foods"} in your library</p>
          )}
        </Card>
      </div>
    </Page>
  );
}
