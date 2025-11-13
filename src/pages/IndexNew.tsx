import { useState, useEffect } from "react";
import { LoadingView } from "@/components/tracker/LoadingView";
import { SetupView } from "@/components/tracker/SetupView";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorModal } from "@/components/tracker/ErrorModal";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import { Plus, RotateCcw, Minus, X } from "lucide-react";
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
    updateShift,
    updateAssignedAPPs,
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
            <div className="bg-gradient-to-br from-primary/10 to-accent rounded-2xl p-6 mb-6 border border-primary/20">
              <h2 className="text-xl font-bold text-foreground mb-4 text-center">
                📊 Resumo do Dia
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-card/50 backdrop-blur rounded-xl p-4 border border-border">
                  <span className="block text-xs font-medium text-muted-foreground mb-2">
                    Total Atribuído
                  </span>
                  <span className="text-3xl font-bold text-primary">
                    {totalTarget}
                  </span>
                </div>
                <div className="bg-card/50 backdrop-blur rounded-xl p-4 border border-border">
                  <span className="block text-xs font-medium text-muted-foreground mb-2">
                    Total Concluído
                  </span>
                  <span className="text-3xl font-bold text-success">
                    {totalDone}
                  </span>
                </div>
                <div className="bg-card/50 backdrop-blur rounded-xl p-4 border border-border">
                  <span className="block text-xs font-medium text-muted-foreground mb-2">
                    Pendente
                  </span>
                  <span className="text-3xl font-bold text-warning">
                    {totalPending}
                  </span>
                </div>
              </div>
            </div>

            {/* Add More APPs */}
            <div className="bg-card rounded-xl p-5 mb-4 border border-border shadow-sm">
              <Label htmlFor="additionalAPPs" className="text-sm font-semibold mb-3 block text-foreground">
                ➕ Adicionar mais APPs à fila
              </Label>
              <div className="flex gap-2">
                <Input
                  id="additionalAPPs"
                  type="number"
                  min="1"
                  value={additionalAPPs}
                  onChange={(e) => setAdditionalAPPs(e.target.value)}
                  placeholder="Ex: 20"
                  className="flex-1 border-2 focus:border-primary"
                />
                <Button
                  onClick={handleAddAPPs}
                  className="shrink-0 bg-success hover:bg-success/90 text-success-foreground gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Add Person */}
            <div className="bg-card rounded-xl p-5 mb-6 border border-border shadow-sm">
              <Label className="text-sm font-semibold mb-3 block text-foreground">
                👤 Adicionar novo participante
              </Label>
              <div className="space-y-3">
                <Select value={newPersonShift} onValueChange={(value: '7am' | '8am' | '9am') => setNewPersonShift(value)}>
                  <SelectTrigger className="border-2 focus:border-primary">
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
                    className="flex-1 border-2 focus:border-primary"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPerson();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddPerson}
                    className="shrink-0 bg-info hover:bg-info/90 text-info-foreground gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* People List by Shift */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground">
                🎯 Progresso por Turno
              </h3>
              
              {['7am', '8am', '9am'].map((shift) => {
                const shiftPeople = people.filter(p => p.shift_time === shift);
                if (shiftPeople.length === 0) return null;

                return (
                  <div key={shift} className="space-y-3">
                    <h4 className="text-sm font-bold text-primary uppercase bg-gradient-to-r from-primary/20 to-primary/5 px-4 py-2 rounded-lg border-l-4 border-primary">
                      ⏰ Turno {shift}
                    </h4>
                    {shiftPeople.map((person) => {
                      const progressPercent = person.assigned_apps > 0 
                        ? (person.current_progress / person.assigned_apps) * 100 
                        : 0;
                      const isComplete = person.current_progress >= person.assigned_apps;

                      return (
                        <Card
                          key={person.id}
                          className={`p-5 transition-smooth border-2 ${
                            isComplete ? "bg-success/5 border-success/30 shadow-lg shadow-success/10" : "bg-card border-border shadow-md hover:shadow-lg"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-lg font-bold ${
                                  isComplete ? "text-success" : "text-foreground"
                                }`}
                              >
                                {person.name}
                              </span>
                              <Select 
                                value={person.shift_time} 
                                onValueChange={(value: '7am' | '8am' | '9am') => updateShift(person.id, value)}
                              >
                                <SelectTrigger className="w-[100px] h-8 text-xs font-medium border-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="7am">7:00</SelectItem>
                                  <SelectItem value="8am">8:00</SelectItem>
                                  <SelectItem value="9am">9:00</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex flex-col gap-1 bg-gradient-to-b from-info/20 to-warning/20 rounded-lg border-2 border-info/30 p-1 shadow-sm">
                                <Button
                                  onClick={() => updateAssignedAPPs(person.id, 1)}
                                  size="sm"
                                  variant="ghost"
                                  className="w-7 h-6 p-0 bg-info/80 hover:bg-info text-info-foreground rounded"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  onClick={() => updateAssignedAPPs(person.id, -1)}
                                  disabled={person.assigned_apps <= person.current_progress}
                                  size="sm"
                                  variant="ghost"
                                  className="w-7 h-6 p-0 bg-warning/80 hover:bg-warning text-warning-foreground disabled:opacity-30 rounded"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              <Button
                                onClick={() => {
                                  if (window.confirm(`Tem a certeza de que quer eliminar ${person.name}? Os APPs serão redistribuídos.`)) {
                                    removePerson(person.id);
                                  }
                                }}
                                size="sm"
                                variant="ghost"
                                className="w-8 h-8 p-0 bg-destructive/10 hover:bg-destructive/20 text-destructive border-2 border-destructive/30 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                onClick={() => updateProgress(person.id, Math.max(0, person.current_progress - 1))}
                                disabled={person.current_progress === 0}
                                size="sm"
                                className="w-10 h-10 p-0 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-30 shadow-md border-2 border-destructive/50"
                              >
                                <Minus className="w-5 h-5" />
                              </Button>
                              <span
                                className={`text-2xl font-bold w-24 text-center ${
                                  isComplete ? "text-success" : "text-foreground"
                                }`}
                              >
                                {person.current_progress} / {person.assigned_apps}
                              </span>
                              <Button
                                onClick={() => updateProgress(person.id, Math.min(person.assigned_apps, person.current_progress + 1))}
                                disabled={isComplete}
                                size="sm"
                                className="w-10 h-10 p-0 rounded-full bg-success hover:bg-success/90 text-success-foreground disabled:opacity-30 shadow-md border-2 border-success/50"
                              >
                                <Plus className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 border border-border shadow-inner">
                            <div
                              className={`h-3 rounded-full transition-smooth ${
                                isComplete ? "bg-gradient-to-r from-success to-success/80" : "bg-gradient-to-r from-primary to-info"
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <div className="mt-2 text-right text-sm font-bold text-primary">
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