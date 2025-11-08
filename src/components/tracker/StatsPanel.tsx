import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { toast } from "sonner";
import type { DayState, WeeklyData } from "@/pages/Index";

interface StatsPanelProps {
  dayState: DayState;
  weeklyData: WeeklyData;
  onError: (message: string) => void;
}

const WORK_HOURS = 6.5; // 6:30 hours
const WORK_MINUTES = WORK_HOURS * 60; // 390 minutes

export const StatsPanel = ({ dayState, weeklyData, onError }: StatsPanelProps) => {
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const calculateAHT = (person: typeof dayState.people[0]) => {
    if (person.current === 0) return 0;
    return WORK_MINUTES / person.current;
  };

  const getWeeklyStats = (personName: string) => {
    const weekDates = Object.keys(weeklyData).sort().slice(-7);
    let totalAppeals = 0;
    let totalAPPs = 0;

    weekDates.forEach(date => {
      const dayData = weeklyData[date];
      const person = dayData.people.find(p => p.name === personName);
      if (person) {
        totalAppeals += person.appeals.length;
        totalAPPs += person.current;
      }
    });

    // Include today's data
    const todayPerson = dayState.people.find(p => p.name === personName);
    if (todayPerson) {
      totalAppeals += todayPerson.appeals.length;
      totalAPPs += todayPerson.current;
    }

    return { totalAppeals, totalAPPs };
  };

  const exportToGoogleSheets = async () => {
    if (!webhookUrl) {
      onError("Por favor, insira o URL do webhook do Google Sheets.");
      return;
    }

    setIsExporting(true);

    try {
      const sheetsData = dayState.people.map(person => {
        const aht = calculateAHT(person);
        const weeklyStats = getWeeklyStats(person.name);
        const avgReviewTime = person.appeals.length > 0
          ? person.appeals.reduce((sum, a) => sum + a.reviewTime, 0) / person.appeals.length
          : 0;

        return {
          name: person.name,
          date: dayState.date,
          appsCompleted: person.current,
          appsTarget: person.target,
          aht: aht.toFixed(2),
          dailyAppeals: person.appeals.length,
          avgReviewTime: avgReviewTime.toFixed(2),
          weeklyAppeals: weeklyStats.totalAppeals,
          weeklyAPPs: weeklyStats.totalAPPs
        };
      });

      // Calculate group totals
      const groupData = {
        date: dayState.date,
        totalAPPs: dayState.people.reduce((sum, p) => sum + p.current, 0),
        totalTarget: dayState.people.reduce((sum, p) => sum + p.target, 0),
        totalAppeals: dayState.people.reduce((sum, p) => sum + p.appeals.length, 0),
        avgAHT: (dayState.people.reduce((sum, p) => sum + calculateAHT(p), 0) / dayState.people.length).toFixed(2),
        teamSize: dayState.people.length
      };

      const payload = {
        individualData: sheetsData,
        groupData: groupData,
        timestamp: new Date().toISOString()
      };

      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify(payload),
      });

      toast.success("Dados exportados para Google Sheets com sucesso!");
    } catch (error) {
      console.error("Error exporting to sheets:", error);
      onError("Erro ao exportar dados. Verifique o URL do webhook.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="p-6 mb-6 bg-accent/30 border-accent">
      <h2 className="text-xl font-bold text-foreground mb-4">Estatísticas</h2>
      
      {/* Individual Stats */}
      <div className="space-y-4 mb-6">
        {dayState.people.map(person => {
          const aht = calculateAHT(person);
          const weeklyStats = getWeeklyStats(person.name);
          const avgReviewTime = person.appeals.length > 0
            ? person.appeals.reduce((sum, a) => sum + a.reviewTime, 0) / person.appeals.length
            : 0;

          return (
            <Card key={person.name} className="p-4">
              <h3 className="font-semibold text-lg mb-3 text-foreground">{person.name}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">AHT (min/APP):</span>
                  <p className="font-bold text-primary">{aht.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Appeals Hoje:</span>
                  <p className="font-bold text-foreground">{person.appeals.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tempo Médio Revisão:</span>
                  <p className="font-bold text-foreground">{avgReviewTime.toFixed(2)} min</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Appeals Semanais:</span>
                  <p className="font-bold text-foreground">{weeklyStats.totalAppeals}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Export Section */}
      <div className="space-y-3 pt-4 border-t border-border">
        <Label htmlFor="webhookUrl" className="text-sm font-medium">
          URL do Webhook do Google Sheets (Zapier)
        </Label>
        <Input
          id="webhookUrl"
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://hooks.zapier.com/..."
          className="text-sm"
        />
        <Button
          onClick={exportToGoogleSheets}
          disabled={!webhookUrl || isExporting}
          className="w-full gap-2"
        >
          <Download className="w-4 h-4" />
          {isExporting ? "Exportando..." : "Exportar para Google Sheets"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Configure um Zap com Webhook trigger e Google Sheets action. Use os campos "individualData" e "groupData" para criar pestañas separadas.
        </p>
      </div>
    </Card>
  );
};
