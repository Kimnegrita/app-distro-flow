import { useState, useEffect } from "react";
import { LoadingView } from "@/components/tracker/LoadingView";
import { SetupView } from "@/components/tracker/SetupView";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorModal } from "@/components/tracker/ErrorModal";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import { Plus, RotateCcw, Minus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const IndexNew = () => {
  const {
    session,
    people,
    loading,
    startSession,
    updateProgress,
    addMoreAPPs,
    addPerson,
    removePerson,
    resetSession,
  } = useRealtimeSession();

  const [view, setView] = useState<"setup" | "tracker">("setup");
  const [error, setError] = useState<string>("");
  const [additionalAPPs, setAdditionalAPPs] = useState<string>("");
  const [newPersonName, setNewPersonName] = useState<string>("");
  const [newPersonShift, setNewPersonShift] = useState<'7am' | '8am' | '9am'>('7am');

  useEffect(() => {
    if (!loading) {
      setView(session ? "tracker" : "setup");
    }
  }, [session, loading]);

  const handleStartDay = async (
    totalAPPs: number,
    peopleData: Array<{ name: string; shift_time: '7am' | '8am' | '9am' }>
  ) => {
    try {
      await startSession(totalAPPs, peopleData);
      setView("tracker");
    } catch (error) {
      showError("Não foi possível iniciar a jornada.");
    }
  };

  const handleAddAPPs = async () => {
    const appsToAdd = parseInt(additionalAPPs);
    if (isNaN(appsToAdd) || appsToAdd <= 0) {
      showError("Por favor, insira um número válido de APPs.");
      return;
    }
    await addMoreAPPs(appsToAdd);
    setAdditionalAPPs("");
  };

  const handleAddPerson = async () => {
    const name = newPersonName.trim();
    if (!name) {
      showError("Por favor, insira um nome válido.");
      return;
    }
    await addPerson(name, newPersonShift);
    setNewPersonName("");
  };

  const handleReset = async () => {
    if (window.confirm("Tem a certeza de que quer reiniciar a jornada? Todo o progresso será eliminado.")) {
      await resetSession();
      setView("setup");
    }
  };

  const showError = (message: string) => {
    setError(message);
  };

  const closeError = () => {
    setError("");
  };

  const totalDone = people.reduce((sum, p) => sum + p.current_progress, 0);
  const totalTarget = people.reduce((sum, p) => sum + p.assigned_apps, 0);
  const totalPending = Math.max(0, totalTarget - totalDone);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <LoadingView />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {view === "setup" && <SetupView onStartDay={handleStartDay} onError={showError} />}
        
        {view === "tracker" && session && (
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
            <div className="bg-muted/50 rounded-xl p-4 mb-4 border border-border">
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

            {/* Add Person */}
            <div className="bg-muted/50 rounded-xl p-4 mb-6 border border-border">
              <Label className="text-sm font-medium mb-2 block">
                Adicionar novo participante
              </Label>
              <div className="space-y-2">
                <Select value={newPersonShift} onValueChange={(value: '7am' | '8am' | '9am') => setNewPersonShift(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7am">7:00 AM</SelectItem>
                    <SelectItem value="8am">8:00 AM</SelectItem>
                    <SelectItem value="9am">9:00 AM</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="Nome da pessoa"
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPerson();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddPerson}
                    className="shrink-0 bg-primary hover:bg-primary/90 gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* People List by Shift */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Progresso por Turno
              </h3>
              
              {['7am', '8am', '9am'].map((shift) => {
                const shiftPeople = people.filter(p => p.shift_time === shift);
                if (shiftPeople.length === 0) return null;

                return (
                  <div key={shift} className="space-y-2">
                    <h4 className="text-xs font-bold text-primary uppercase bg-primary/10 px-3 py-1 rounded">
                      Turno {shift}
                    </h4>
                    {shiftPeople.map((person) => {
                      const progressPercent = person.assigned_apps > 0 
                        ? (person.current_progress / person.assigned_apps) * 100 
                        : 0;
                      const isComplete = person.current_progress >= person.assigned_apps;

                      return (
                        <Card
                          key={person.id}
                          className={`p-4 transition-smooth ${
                            isComplete ? "bg-success/10 border-success/20" : "bg-card"
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
                                onClick={() => updateProgress(person.id, Math.max(0, person.current_progress - 1))}
                                disabled={person.current_progress === 0}
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
                                {person.current_progress} / {person.assigned_apps}
                              </span>
                              <Button
                                onClick={() => updateProgress(person.id, Math.min(person.assigned_apps, person.current_progress + 1))}
                                disabled={isComplete}
                                size="sm"
                                variant="outline"
                                className="w-8 h-8 p-0 rounded-full bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 disabled:opacity-30"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
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
                    })}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
      <ErrorModal message={error} onClose={closeError} />
    </div>
  );
};

export default IndexNew;