import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Minus, Plus } from "lucide-react";
import type { Person } from "@/pages/Index";

interface PersonProgressProps {
  person: Person;
  onIncrement: () => void;
  onDecrement: () => void;
}

export const PersonProgress = ({
  person,
  onIncrement,
  onDecrement,
}: PersonProgressProps) => {
  const progressPercent =
    person.target > 0 ? (person.current / person.target) * 100 : 0;
  const isComplete = person.current >= person.target;

  return (
    <Card
      className={`p-4 transition-smooth ${
        isComplete
          ? "bg-success/10 border-success/20"
          : "bg-card"
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <span
          className={`text-lg font-semibold ${
            isComplete ? "text-success" : "text-foreground"
          }`}
        >
          {person.name}
        </span>
        <div className="flex items-center gap-3">
          <Button
            onClick={onDecrement}
            disabled={person.current === 0}
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 rounded-full bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20 disabled:opacity-30"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span
            className={`text-xl font-semibold w-20 text-center ${
              isComplete ? "text-success" : "text-foreground"
            }`}
          >
            {person.current} / {person.target}
          </span>
          <Button
            onClick={onIncrement}
            disabled={isComplete}
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 rounded-full bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 disabled:opacity-30"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-smooth ${
            isComplete ? "bg-success" : "bg-primary"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="mt-1 text-right text-xs text-muted-foreground">
        {Math.round(progressPercent)}%
      </div>
    </Card>
  );
};
