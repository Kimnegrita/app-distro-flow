import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonProgress } from "./PersonProgress";
import { RotateCcw, Plus } from "lucide-react";
import type { DayState } from "@/pages/Index";

interface TrackerViewProps {
  dayState: DayState;
  onUpdateProgress: (name: string, increment: boolean) => void;
  onAddMoreAPPs: (additionalAPPs: number) => void;
  onReset: () => void;
  onError: (message: string) => void;
}

export const TrackerView = ({
  dayState,
  onUpdateProgress,
  onAddMoreAPPs,
  onReset,
  onError,
}: TrackerViewProps) => {
  const [additionalAPPs, setAdditionalAPPs] = useState<string>("");
  
  const totalDone = dayState.people.reduce((sum, p) => sum + p.current, 0);
  const totalTarget = dayState.people.reduce((sum, p) => sum + p.target, 0);
  const totalPending = Math.max(0, totalTarget - totalDone);

  const handleAddAPPs = () => {
    const appsToAdd = parseInt(additionalAPPs);
    
    if (isNaN(appsToAdd) || appsToAdd <= 0) {
      onError("Por favor, insira um número válido de APPs para adicionar.");
      return;
    }

    onAddMoreAPPs(appsToAdd);
    setAdditionalAPPs("");
  };

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

      {/* Add More APPs */}
      <div className="bg-muted/50 rounded-xl p-4 mb-6 border border-border">
        <Label htmlFor="additionalAPPs" className="text-sm font-medium mb-2 block">
          Adicionar mais APPs à fila
        </Label>
        <div className="flex gap-2">
          <Input
            id="additionalAPPs"
            type="number"
            min="1"
            value={additionalAPPs}
            onChange={(e) => setAdditionalAPPs(e.target.value)}
            placeholder="Ex: 20"
            className="flex-1"
          />
          <Button
            onClick={handleAddAPPs}
            className="shrink-0 bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </Button>
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
