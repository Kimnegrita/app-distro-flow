import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface SetupViewProps {
  onStartDay: (totalAPPs: number, people: string[]) => void;
  onError: (message: string) => void;
}

export const SetupView = ({ onStartDay, onError }: SetupViewProps) => {
  const [totalAPPs, setTotalAPPs] = useState<string>("");
  const [personName, setPersonName] = useState<string>("");
  const [peopleList, setPeopleList] = useState<string[]>([]);

  const handleAddPerson = () => {
    const name = personName.trim();
    if (!name) return;
    
    if (peopleList.includes(name)) {
      onError(`A pessoa "${name}" já está na lista.`);
      return;
    }

    setPeopleList([...peopleList, name]);
    setPersonName("");
  };

  const handleRemovePerson = (name: string) => {
    setPeopleList(peopleList.filter((p) => p !== name));
  };

  const handleStartDay = () => {
    const total = parseInt(totalAPPs);
    
    if (isNaN(total) || total < 0) {
      onError("Por favor, insira um número válido de APPs.");
      return;
    }

    if (peopleList.length === 0) {
      onError("Deve adicionar pelo menos uma pessoa.");
      return;
    }

    onStartDay(total, peopleList);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddPerson();
    }
  };

  return (
    <Card className="p-8 shadow-xl">
      <h1 className="text-3xl font-bold text-center mb-6 text-foreground">
        Configurar Jornada de APPs
      </h1>

      <div className="space-y-6">
        {/* Total APPs Input */}
        <div className="space-y-2">
          <Label htmlFor="totalAPPs" className="text-sm font-medium">
            Total de APPs na Fila
          </Label>
          <Input
            id="totalAPPs"
            type="number"
            min="0"
            value={totalAPPs}
            onChange={(e) => setTotalAPPs(e.target.value)}
            placeholder="Ex: 50"
            className="text-base"
          />
        </div>

        {/* Add Person Section */}
        <div className="space-y-2">
          <Label htmlFor="personName" className="text-sm font-medium">
            Participantes
          </Label>
          <div className="flex gap-2">
            <Input
              id="personName"
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Insira o nome"
              className="text-base flex-1"
            />
            <Button
              onClick={handleAddPerson}
              size="lg"
              className="shrink-0 bg-primary hover:bg-primary/90"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* People List */}
        {peopleList.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Pessoas em turno:
            </h3>
            <div className="space-y-2">
              {peopleList.map((person) => (
                <div
                  key={person}
                  className="flex items-center justify-between p-3 bg-accent rounded-lg"
                >
                  <span className="font-medium text-foreground">{person}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePerson(person)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {peopleList.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            Ainda não foram adicionadas pessoas.
          </p>
        )}

        {/* Start Button */}
        <Button
          onClick={handleStartDay}
          disabled={peopleList.length === 0}
          className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold py-6 text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Iniciar Jornada
        </Button>
      </div>
    </Card>
  );
};
