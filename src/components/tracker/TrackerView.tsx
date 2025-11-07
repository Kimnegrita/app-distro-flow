import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PersonProgress } from "./PersonProgress";
import { RotateCcw } from "lucide-react";
import type { DayState } from "@/pages/Index";

interface TrackerViewProps {
  dayState: DayState;
  onUpdateProgress: (name: string, increment: boolean) => void;
  onReset: () => void;
}

export const TrackerView = ({
  dayState,
  onUpdateProgress,
  onReset,
}: TrackerViewProps) => {
  const totalDone = dayState.people.reduce((sum, p) => sum + p.current, 0);
  const totalTarget = dayState.people.reduce((sum, p) => sum + p.target, 0);
  const totalPending = Math.max(0, totalTarget - totalDone);

  const handleReset = () => {
    if (
      window.confirm(
        "Tem a certeza de que quer reiniciar a jornada? Todo o progresso será eliminado."
      )
    ) {
      onReset();
    }
  };

  return (
    <Card className="p-6 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Distribuidor de APPs</h1>
        <Button
          onClick={handleReset}
          variant="destructive"
          size="sm"
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reiniciar
        </Button>
      </div>

      {/* Summary */}
      <div className="bg-accent rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold text-accent-foreground mb-3 text-center">
          Resumo do Dia
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <span className="block text-xs text-muted-foreground mb-1">
              Total Atribuído
            </span>
            <span className="text-2xl font-bold text-primary">
              {totalTarget}
            </span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground mb-1">
              Total Concluído
            </span>
            <span className="text-2xl font-bold text-success">
              {totalDone}
            </span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground mb-1">
              Pendente
            </span>
            <span className="text-2xl font-bold text-destructive">
              {totalPending}
            </span>
          </div>
        </div>
      </div>

      {/* Individual Progress */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Progresso Individual
        </h3>
        {dayState.people.map((person) => (
          <PersonProgress
            key={person.name}
            person={person}
            onIncrement={() => onUpdateProgress(person.name, true)}
            onDecrement={() => onUpdateProgress(person.name, false)}
          />
        ))}
      </div>
    </Card>
  );
};
