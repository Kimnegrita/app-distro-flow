import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Minus, Plus, Trash2, AlertCircle } from "lucide-react";
import type { Person } from "@/pages/Index";

interface PersonProgressProps {
  person: Person;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onAddAppeal: (reviewTime: number) => void;
  canRemove: boolean;
}

export const PersonProgress = ({
  person,
  onIncrement,
  onDecrement,
  onRemove,
  onAddAppeal,
  canRemove,
}: PersonProgressProps) => {
  const [reviewTime, setReviewTime] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const progressPercent =
    person.target > 0 ? (person.current / person.target) * 100 : 0;
  const isComplete = person.current >= person.target;

  const handleAddAppeal = () => {
    const time = parseInt(reviewTime);
    if (!isNaN(time) && time > 0) {
      onAddAppeal(time);
      setReviewTime("");
      setIsDialogOpen(false);
    }
  };

  return (
    <Card
      className={`p-4 transition-smooth ${
        isComplete
          ? "bg-success/10 border-success/20"
          : "bg-card"
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-lg font-semibold ${
              isComplete ? "text-success" : "text-foreground"
            }`}
          >
            {person.name}
          </span>
          {person.appeals.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              {person.appeals.length} appeals
            </span>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                title="Registrar appeal"
              >
                <AlertCircle className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Appeal - {person.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reviewTime">Tiempo de revisión (minutos)</Label>
                  <Input
                    id="reviewTime"
                    type="number"
                    min="1"
                    value={reviewTime}
                    onChange={(e) => setReviewTime(e.target.value)}
                    placeholder="Ej: 15"
                  />
                </div>
                <Button
                  onClick={handleAddAppeal}
                  disabled={!reviewTime || parseInt(reviewTime) <= 0}
                  className="w-full"
                >
                  Registrar Appeal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {canRemove && (
            <Button
              onClick={onRemove}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Remover participante"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
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
