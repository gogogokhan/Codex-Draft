"use client";

import { ClipboardList, LayoutGrid, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { WizardStep } from "@/types";

const STEPS: { id: WizardStep; label: string; icon: typeof Users }[] = [
  { id: "players", label: "Oyuncu Havuzu", icon: Users },
  { id: "match", label: "Maç Ayarları", icon: ClipboardList },
  { id: "draft", label: "Kadro & Saha", icon: LayoutGrid },
];

export function StepNav() {
  const { currentStep, setCurrentStep, draftResult } = useApp();

  return (
    <nav className="mx-auto mb-8 max-w-7xl px-4 sm:px-6">
      <ol className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isDraftLocked = step.id === "draft" && !draftResult;
          const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
          const isPast = index < stepIndex;

          return (
            <li key={step.id} className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                disabled={isDraftLocked}
                onClick={() => !isDraftLocked && setCurrentStep(step.id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all sm:px-4 ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                    : isPast
                      ? "text-zinc-300 hover:bg-zinc-800"
                      : isDraftLocked
                        ? "cursor-not-allowed text-zinc-600"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{index + 1}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={`hidden h-px w-8 sm:block ${
                    isPast ? "bg-emerald-500/50" : "bg-zinc-700"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
