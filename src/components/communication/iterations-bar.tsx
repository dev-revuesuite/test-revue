"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Iteration {
  id: string;
  name: string;
  version: number;
}

const initialIterations: Iteration[] = [
  { id: "5", name: "Iteration 5", version: 5 },
  { id: "4", name: "Iteration 4", version: 4 },
  { id: "3", name: "Iteration 3", version: 3 },
  { id: "2", name: "Iteration 2", version: 2 },
  { id: "1", name: "Iteration 1", version: 1 },
];

export function IterationsBar() {
  const [iterations, setIterations] = useState<Iteration[]>(initialIterations);
  const [activeIteration, setActiveIteration] = useState("5");

  const handlePrevious = () => {
    const currentIndex = iterations.findIndex((i) => i.id === activeIteration);
    if (currentIndex < iterations.length - 1) {
      setActiveIteration(iterations[currentIndex + 1].id);
    }
  };

  const handleNext = () => {
    const currentIndex = iterations.findIndex((i) => i.id === activeIteration);
    if (currentIndex > 0) {
      setActiveIteration(iterations[currentIndex - 1].id);
    }
  };

  const handleCreateIteration = () => {
    const newVersion = iterations.length + 1;
    const newIteration: Iteration = {
      id: String(newVersion),
      name: `Iteration ${newVersion}`,
      version: newVersion,
    };
    setIterations([newIteration, ...iterations]);
    setActiveIteration(newIteration.id);
  };

  const currentIndex = iterations.findIndex((i) => i.id === activeIteration);
  const canGoPrevious = currentIndex < iterations.length - 1;
  const canGoNext = currentIndex > 0;

  return (
    <div className="flex items-center gap-3">
      {/* Iterations Navigation */}
      <div className="flex items-center gap-1.5 bg-white rounded-lg shadow-sm border border-gray-200 px-2 py-1.5">
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-md transition-colors",
            canGoPrevious
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Iterations */}
        <div className="flex items-center gap-0.5">
          {iterations.slice(0, 5).map((iteration) => (
            <button
              key={iteration.id}
              onClick={() => setActiveIteration(iteration.id)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                activeIteration === iteration.id
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {iteration.name}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-md transition-colors",
            canGoNext
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Create Iteration Button */}
      <Button
        onClick={handleCreateIteration}
        size="sm"
        className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg gap-1.5"
      >
        <Plus className="w-4 h-4" />
        New Iteration
      </Button>
    </div>
  );
}
