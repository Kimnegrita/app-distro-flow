import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Send } from "lucide-react";
import type { DayState } from "@/pages/Index";
import { useState } from "react";

interface AppealsStatsProps {
  dayState: DayState;
  onExportToSheets: (webhookUrl: string) => void;
}

export const AppealsStats = ({ dayState, onExportToSheets }: AppealsStatsProps) => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showExport, setShowExport] = useState(false);

  const calculateStats = () => {
    return dayState.people.map((person) => {
      const totalAppeals = person.appeals.length;
      const avgReviewTime =
        totalAppeals > 0
          ? person.appeals.reduce((sum, appeal) => sum + appeal.reviewTime, 0) / totalAppeals
          : 0;
      
      const appsPerAppeal = person.current > 0 ? person.current / (totalAppeals || 1) : 0;

      return {
        name: person.name,
        totalAppeals,
        avgReviewTime: Math.round(avgReviewTime),
        appsCompleted: person.current,
        appsPerAppeal: appsPerAppeal.toFixed(2),
      };
    });
  };

  const stats = calculateStats();
  const totalAppeals = stats.reduce((sum, s) => sum + s.totalAppeals, 0);

  const handleExport = () => {
    if (webhookUrl.trim()) {
      onExportToSheets(webhookUrl);
    }
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Estadísticas de Appeals
          </h2>
        </div>
        <Button
          onClick={() => setShowExport(!showExport)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Exportar a Sheets
        </Button>
      </div>

      {/* Export Section */}
      {showExport && (
        <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
          <Label htmlFor="webhookUrl" className="text-sm font-medium mb-2 block">
            Webhook URL de Zapier (conectado a Google Sheets)
          </Label>
          <div className="flex gap-2">
            <Input
              id="webhookUrl"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              className="flex-1"
            />
            <Button
              onClick={handleExport}
              disabled={!webhookUrl.trim()}
              className="shrink-0"
            >
              Enviar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Crea un Zap con trigger "Catch Hook" en Zapier y conecta a Google Sheets
          </p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="mb-4 p-3 bg-accent/50 rounded-lg">
        <div className="text-center">
          <span className="text-sm text-muted-foreground">Total de Appeals</span>
          <p className="text-2xl font-bold text-primary">{totalAppeals}</p>
        </div>
      </div>

      {/* Individual Stats */}
      <div className="space-y-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="p-4 bg-card border border-border rounded-lg"
          >
            <h3 className="font-semibold text-foreground mb-3">{stat.name}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Appeals:</span>
                <p className="font-semibold text-foreground">{stat.totalAppeals}</p>
              </div>
              <div>
                <span className="text-muted-foreground">APPs completados:</span>
                <p className="font-semibold text-foreground">{stat.appsCompleted}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tiempo promedio:</span>
                <p className="font-semibold text-foreground">{stat.avgReviewTime} min</p>
              </div>
              <div>
                <span className="text-muted-foreground">APPs por appeal:</span>
                <p className="font-semibold text-foreground">{stat.appsPerAppeal}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalAppeals === 0 && (
        <p className="text-center text-muted-foreground italic py-4">
          Aún no se han registrado appeals
        </p>
      )}
    </Card>
  );
};
