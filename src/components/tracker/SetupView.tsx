import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SetupViewProps {
  onStartDay: (totalAPPs: number, peopleData: Array<{ name: string; shift_time: '7am' | '8am' | '9am' }>) => void;
  onError: (message: string) => void;
}

const DEFAULT_TEAM_MEMBERS = [
  "Pedro Martins",
  "Inês Correia",
  "Henrique da Silva",
  "Rafael Videira",
  "Daiane Tavares",
  "Valentina Morales",
  "Kimberly Delgado",
  "Renata Prates",
  "Alvaro Zanoni",
  "Miguel Afonso",
  "Ana Andresson",
  "Beatriz Batista",
  "Maria Inês Gamas Ferreira",
  "Rúdi Santos",
  "João Faria"
];

export const SetupView = ({ onStartDay, onError }: SetupViewProps) => {
  const [totalAPPs, setTotalAPPs] = useState<string>("");
  const [personName, setPersonName] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<'7am' | '8am' | '9am'>('7am');
  const [peopleList, setPeopleList] = useState<Array<{ name: string; shift_time: '7am' | '8am' | '9am' }>>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>(() => {
    const stored = localStorage.getItem("teamMembers");
    return stored ? JSON.parse(stored) : DEFAULT_TEAM_MEMBERS;
  });
  const [newMember, setNewMember] = useState<string>("");
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    localStorage.setItem("teamMembers", JSON.stringify(teamMembers));
  }, [teamMembers]);

  const handleAddPerson = () => {
    const name = personName.trim();
    if (!name) return;
    
    if (peopleList.some(p => p.name === name)) {
      onError(`A pessoa "${name}" já está na lista.`);
      return;
    }

    setPeopleList([...peopleList, { name, shift_time: selectedShift }]);
    setPersonName("");
  };

  const handleRemovePerson = (name: string) => {
    setPeopleList(peopleList.filter((p) => p.name !== name));
  };

  const handleSelectMember = (name: string) => {
    if (peopleList.some(p => p.name === name)) {
      onError(`A pessoa "${name}" já está na lista.`);
      return;
    }
    setPeopleList([...peopleList, { name, shift_time: selectedShift }]);
  };

  const handleAddNewMember = () => {
    const name = newMember.trim();
    if (!name) return;
    
    if (teamMembers.includes(name)) {
      onError(`"${name}" já está na lista de membros da equipe.`);
      return;
    }

    setTeamMembers([...teamMembers, name]);
    setNewMember("");
    setShowAddMember(false);
  };

  const handleRemoveMember = (name: string) => {
    setTeamMembers(teamMembers.filter((m) => m !== name));
    setPeopleList(peopleList.filter((p) => p.name !== name));
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
        Distribuidor de APPs
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

        {/* Team Members Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Membros da Equipe
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddMember(!showAddMember)}
              className="h-7 gap-1 text-xs"
            >
              <Users className="w-3 h-3" />
              Gerenciar Equipe
            </Button>
          </div>

          {showAddMember && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNewMember();
                    }
                  }}
                  placeholder="Nome do novo membro"
                  className="text-sm flex-1"
                />
                <Button
                  onClick={handleAddNewMember}
                  size="sm"
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {teamMembers.map((member) => (
                  <div
                    key={member}
                    className="flex items-center justify-between p-2 bg-background rounded text-sm"
                  >
                    <span>{member}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Select onValueChange={handleSelectMember}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um membro da equipe" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers
                .filter(member => !peopleList.some(p => p.name === member))
                .map((member) => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Shift Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Turno de entrada
          </Label>
          <Select value={selectedShift} onValueChange={(value: '7am' | '8am' | '9am') => setSelectedShift(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7am">7:00 AM</SelectItem>
              <SelectItem value="8am">8:00 AM</SelectItem>
              <SelectItem value="9am">9:00 AM</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Add Person Manually */}
        <div className="space-y-2">
          <Label htmlFor="personName" className="text-sm font-medium">
            Adicionar pessoa ao turno {selectedShift}
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
              {['7am', '8am', '9am'].map(shift => {
                const shiftPeople = peopleList.filter(p => p.shift_time === shift);
                if (shiftPeople.length === 0) return null;
                
                return (
                  <div key={shift} className="space-y-1">
                    <p className="text-xs font-semibold text-primary uppercase">{shift}</p>
                    {shiftPeople.map((person) => (
                      <div
                        key={person.name}
                        className="flex items-center justify-between p-3 bg-accent rounded-lg"
                      >
                        <span className="font-medium text-foreground">{person.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePerson(person.name)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })}
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
