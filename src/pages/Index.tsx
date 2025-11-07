import { useState } from "react";
import { LoadingView } from "@/components/tracker/LoadingView";
import { SetupView } from "@/components/tracker/SetupView";
import { TrackerView } from "@/components/tracker/TrackerView";
import { ErrorModal } from "@/components/tracker/ErrorModal";

export type Person = {
  name: string;
  target: number;
  current: number;
};

export type DayState = {
  totalAPPs: number;
  people: Person[];
};

const Index = () => {
  const [view, setView] = useState<"loading" | "setup" | "tracker">("setup");
  const [dayState, setDayState] = useState<DayState | null>(null);
  const [error, setError] = useState<string>("");

  const handleStartDay = (totalAPPs: number, peopleNames: string[]) => {
    const totalPersonas = peopleNames.length;
    const appsBase = Math.floor(totalAPPs / totalPersonas);
    const sobrantes = totalAPPs % totalPersonas;

    const peopleData: Person[] = peopleNames.map((name, index) => {
      const target = appsBase + (index < sobrantes ? 1 : 0);
      return {
        name,
        target,
        current: 0,
      };
    });

    setDayState({
      totalAPPs,
      people: peopleData,
    });
    setView("tracker");
  };

  const handleUpdateProgress = (name: string, increment: boolean) => {
    if (!dayState) return;

    setDayState({
      ...dayState,
      people: dayState.people.map((person) =>
        person.name === name
          ? {
              ...person,
              current: increment
                ? Math.min(person.current + 1, person.target)
                : Math.max(person.current - 1, 0),
            }
          : person
      ),
    });
  };

  const handleAddMoreAPPs = (additionalAPPs: number) => {
    if (!dayState) return;

    const newTotalAPPs = dayState.totalAPPs + additionalAPPs;
    const totalPersonas = dayState.people.length;
    const appsBase = Math.floor(newTotalAPPs / totalPersonas);
    const sobrantes = newTotalAPPs % totalPersonas;

    const updatedPeople: Person[] = dayState.people.map((person, index) => {
      const newTarget = appsBase + (index < sobrantes ? 1 : 0);
      return {
        ...person,
        target: newTarget,
      };
    });

    setDayState({
      totalAPPs: newTotalAPPs,
      people: updatedPeople,
    });
  };

  const handleAddPerson = (name: string) => {
    if (!dayState) return;

    // Verificar si la persona ya existe
    if (dayState.people.some(p => p.name === name)) {
      showError(`La persona "${name}" ya está en la lista.`);
      return;
    }

    // Calcular total completado actual
    const totalCompleted = dayState.people.reduce((sum, p) => sum + p.current, 0);
    
    // Calcular APPs pendientes
    const pendingAPPs = dayState.totalAPPs - totalCompleted;
    
    // Nueva cantidad de personas
    const newTotalPersonas = dayState.people.length + 1;
    
    // Redistribuir solo las APPs pendientes entre todos (incluyendo el nuevo)
    const appsBase = Math.floor(pendingAPPs / newTotalPersonas);
    const sobrantes = pendingAPPs % newTotalPersonas;

    const updatedPeople: Person[] = dayState.people.map((person, index) => {
      const newPendingTarget = appsBase + (index < sobrantes ? 1 : 0);
      return {
        ...person,
        target: person.current + newPendingTarget,
      };
    });

    // Agregar nueva persona
    const newPersonTarget = appsBase + (dayState.people.length < sobrantes ? 1 : 0);
    updatedPeople.push({
      name,
      target: newPersonTarget,
      current: 0,
    });

    setDayState({
      ...dayState,
      people: updatedPeople,
    });
  };

  const handleRemovePerson = (name: string) => {
    if (!dayState || dayState.people.length <= 1) {
      showError("Debe haber al menos una persona en la jornada.");
      return;
    }

    const personToRemove = dayState.people.find(p => p.name === name);
    if (!personToRemove) return;

    // APPs pendientes de la persona a eliminar
    const pendingFromRemoved = Math.max(0, personToRemove.target - personToRemove.current);
    
    // Filtrar la persona eliminada
    const remainingPeople = dayState.people.filter(p => p.name !== name);
    
    // Calcular total completado de los que quedan
    const totalCompleted = remainingPeople.reduce((sum, p) => sum + p.current, 0);
    
    // Total pendiente = pendiente original de todos + pendiente del eliminado
    const totalPending = (dayState.totalAPPs - totalCompleted - personToRemove.current) + pendingFromRemoved;
    
    // Redistribuir las APPs pendientes entre los restantes
    const newTotalPersonas = remainingPeople.length;
    const appsBase = Math.floor(totalPending / newTotalPersonas);
    const sobrantes = totalPending % newTotalPersonas;

    const updatedPeople: Person[] = remainingPeople.map((person, index) => {
      const newPendingTarget = appsBase + (index < sobrantes ? 1 : 0);
      return {
        ...person,
        target: person.current + newPendingTarget,
      };
    });

    setDayState({
      ...dayState,
      people: updatedPeople,
    });
  };

  const handleReset = () => {
    setDayState(null);
    setView("setup");
  };

  const showError = (message: string) => {
    setError(message);
  };

  const closeError = () => {
    setError("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {view === "loading" && <LoadingView />}
        {view === "setup" && <SetupView onStartDay={handleStartDay} onError={showError} />}
        {view === "tracker" && dayState && (
          <TrackerView
            dayState={dayState}
            onUpdateProgress={handleUpdateProgress}
            onAddMoreAPPs={handleAddMoreAPPs}
            onAddPerson={handleAddPerson}
            onRemovePerson={handleRemovePerson}
            onReset={handleReset}
            onError={showError}
          />
        )}
      </div>
      <ErrorModal message={error} onClose={closeError} />
    </div>
  );
};

export default Index;
