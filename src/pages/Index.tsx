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
            onReset={handleReset}
          />
        )}
      </div>
      <ErrorModal message={error} onClose={closeError} />
    </div>
  );
};

export default Index;
