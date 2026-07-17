"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import type { FoodMeal } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

const MEALS: { id: FoodMeal; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

type AddState = {
  meal: FoodMeal;
  name: string;
  calories: string;
  protein: string;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string) {
  const today = todayStr();
  if (dateStr === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function MacroRing({
  value,
  target,
  color,
  label,
  unit,
}: {
  value: number;
  target: number;
  color: string;
  label: string;
  unit: string;
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const r = 34;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-20">
        <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#2d2f31" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-semibold text-ink leading-none">{value}</span>
          <span className="text-[10px] text-muted">{unit}</span>
        </div>
      </div>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export function FoodWorkspace() {
  const foodEntries = useAppStore((s) => s.foodEntries);
  const foodTargets = useAppStore((s) => s.foodTargets);
  const addFoodEntry = useAppStore((s) => s.addFoodEntry);
  const deleteFoodEntry = useAppStore((s) => s.deleteFoodEntry);
  const savedFoods = useAppStore((s) => s.savedFoods);
  const addSavedFood = useAppStore((s) => s.addSavedFood);
  const deleteSavedFood = useAppStore((s) => s.deleteSavedFood);

  const [dateOffset, setDateOffset] = useState(0);
  const [adding, setAdding] = useState<FoodMeal | null>(null);
  const [form, setForm] = useState<AddState>({ meal: "breakfast", name: "", calories: "", protein: "" });
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  // Library matches for the food-name search: typed query filters by name,
  // empty query surfaces the most recent saves for one-tap logging
  const libraryMatches = useMemo(() => {
    const q = form.name.trim().toLowerCase();
    const pool = q ? savedFoods.filter((f) => f.name.toLowerCase().includes(q)) : savedFoods;
    return pool.slice(0, 6);
  }, [form.name, savedFoods]);

  const today = todayStr();
  const viewDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().slice(0, 10);
  }, [dateOffset]);

  const dayEntries = useMemo(
    () => foodEntries.filter((e) => e.date === viewDate),
    [foodEntries, viewDate]
  );

  const totalCalories = dayEntries.reduce((s, e) => s + e.calories, 0);
  const totalProtein = dayEntries.reduce((s, e) => s + e.protein, 0);

  function openAdd(meal: FoodMeal) {
    setForm({ meal, name: "", calories: "", protein: "" });
    setSaveToLibrary(false);
    setAdding(meal);
  }

  function submitEntry() {
    if (!form.name.trim() || !form.calories || !form.protein) return;
    const calories = Math.round(parseFloat(form.calories)) || 0;
    const protein = parseFloat(form.protein) || 0;
    addFoodEntry({
      date: viewDate,
      name: form.name.trim(),
      meal: form.meal,
      calories,
      protein,
    });
    if (saveToLibrary) {
      addSavedFood({ name: form.name.trim(), calories, protein });
    }
    setAdding(null);
  }

  function logSavedFood(meal: FoodMeal, foodId: string) {
    const food = savedFoods.find((f) => f.id === foodId);
    if (!food) return;
    addFoodEntry({
      date: viewDate,
      name: food.name,
      meal,
      calories: food.calories,
      protein: food.protein,
    });
    setAdding(null);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="rounded-xl border border-line bg-panel p-5 shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Food</p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">Nutrition log</h1>
          </div>
          {/* Day nav */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDateOffset((o) => o - 1)}
              className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:bg-line hover:text-ink"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[80px] text-center text-sm font-medium text-ink">{formatDate(viewDate)}</span>
            <button
              onClick={() => setDateOffset((o) => o + 1)}
              disabled={viewDate >= today}
              className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:bg-line hover:text-ink disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Macro summary */}
        <div className="mt-5 flex items-center justify-around">
          <MacroRing
            value={totalProtein}
            target={foodTargets.protein}
            color="#34d399"
            label={`/ ${foodTargets.protein}g protein`}
            unit="g"
          />
          <MacroRing
            value={totalCalories}
            target={foodTargets.calories}
            color="#60a5fa"
            label={`/ ${foodTargets.calories} calories`}
            unit="cal"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-20 flex-col items-center justify-center rounded-full border-4 border-line">
              <span className="text-base font-semibold text-ink">{dayEntries.length}</span>
              <span className="text-[10px] text-muted">entries</span>
            </div>
            <p className="text-xs text-muted">logged today</p>
          </div>
        </div>

        {/* Protein bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs text-muted">
            <span>Protein</span>
            <span className={cn(totalProtein >= foodTargets.protein ? "text-mint" : "")}>{totalProtein}g / {foodTargets.protein}g</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-mint transition-all duration-500"
              style={{ width: `${Math.min(100, (totalProtein / foodTargets.protein) * 100)}%` }}
            />
          </div>
        </div>
      </header>

      {/* Meal sections */}
      {MEALS.map(({ id: mealId, label }) => {
        const entries = dayEntries.filter((e) => e.meal === mealId);
        const mealProtein = entries.reduce((s, e) => s + e.protein, 0);
        const mealCalories = entries.reduce((s, e) => s + e.calories, 0);
        const isAdding = adding === mealId;

        return (
          <div key={mealId} className="rounded-xl border border-line bg-panel overflow-hidden">
            {/* Meal header */}
            <div className="flex items-center justify-between border-b border-line bg-line/40 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-ink">{label}</p>
                {entries.length > 0 && (
                  <span className="text-xs text-muted">{mealCalories} cal · {mealProtein}g protein</span>
                )}
              </div>
              <button
                onClick={() => openAdd(mealId)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition hover:bg-line hover:text-ink"
              >
                <Plus className="size-3.5" />
                Add
              </button>
            </div>

            {/* Entries */}
            {entries.length > 0 && (
              <div className="divide-y divide-line">
                {entries.map((entry) => (
                  <div key={entry.id} className="group flex items-center gap-3 px-4 py-2.5">
                    <p className="flex-1 text-sm text-ink">{entry.name}</p>
                    <span className="text-xs text-muted">{entry.calories} cal</span>
                    <span className="min-w-[52px] text-right text-xs font-medium text-mint">{entry.protein}g</span>
                    <button
                      onClick={() => deleteFoodEntry(entry.id)}
                      className="grid size-6 place-items-center rounded text-muted opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline add form */}
            {isAdding && (
              <div className="border-t border-blue/30 bg-blue/5 p-3">
                {/* Library quick-select: search by name, tap to log with saved macros */}
                {libraryMatches.length > 0 && (
                  <div className="mb-2 overflow-hidden rounded-lg border border-line bg-paper">
                    {libraryMatches.map((food) => (
                      <div key={food.id} className="group/lib flex items-center">
                        <button
                          onClick={() => logSavedFood(mealId, food.id)}
                          className="flex min-w-0 flex-1 items-baseline justify-between gap-3 px-3 py-2 text-left transition hover:bg-line"
                        >
                          <span className="truncate text-sm text-ink">{food.name}</span>
                          <span className="shrink-0 text-xs text-muted">{food.calories} cal · {food.protein}g protein</span>
                        </button>
                        <button
                          onClick={() => deleteSavedFood(food.id)}
                          title="Remove from library"
                          className="grid size-7 shrink-0 place-items-center text-muted opacity-0 transition hover:text-red-400 group-hover/lib:opacity-100"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-[1fr_80px_70px] gap-2">
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitEntry(); if (e.key === "Escape") setAdding(null); }}
                    placeholder="Search library or type a new food"
                    className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
                  />
                  <input
                    type="number"
                    min={0}
                    value={form.calories}
                    onChange={(e) => setForm((s) => ({ ...s, calories: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitEntry(); if (e.key === "Escape") setAdding(null); }}
                    placeholder="cal"
                    className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.protein}
                    onChange={(e) => setForm((s) => ({ ...s, protein: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitEntry(); if (e.key === "Escape") setAdding(null); }}
                    placeholder="g protein"
                    className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
                  />
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={submitEntry}
                    disabled={!form.name.trim() || !form.calories || !form.protein}
                    className="rounded-lg bg-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAdding(null)}
                    className="text-xs text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted hover:text-ink">
                    <input
                      type="checkbox"
                      checked={saveToLibrary}
                      onChange={(e) => setSaveToLibrary(e.target.checked)}
                      className="size-3.5 accent-blue"
                    />
                    Save to library
                  </label>
                </div>
              </div>
            )}

            {entries.length === 0 && !isAdding && (
              <p className="px-4 py-3 text-xs text-muted">Nothing logged yet.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
