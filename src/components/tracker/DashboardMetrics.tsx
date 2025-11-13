import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, TrendingUp, Users, Target, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SessionPerson {
  id: string;
  name: string;
  shift_time: string;
  assigned_apps: number;
  current_progress: number;
}

interface DaySession {
  id: string;
  total_apps: number;
  date: string;
  started_at: string;
  is_active: boolean;
}

interface DashboardMetricsProps {
  session: DaySession;
  people: SessionPerson[];
}

export const DashboardMetrics = ({ session, people }: DashboardMetricsProps) => {
  const totalCompleted = people.reduce((sum, p) => sum + p.current_progress, 0);
  const totalAssigned = people.reduce((sum, p) => sum + p.assigned_apps, 0);
  const overallProgress = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;

  // Calculate time-based metrics
  const sessionStartTime = new Date(session.started_at);
  const now = new Date();
  const hoursElapsed = Math.max((now.getTime() - sessionStartTime.getTime()) / (1000 * 60 * 60), 0.1);
  const appsPerHour = totalCompleted / hoursElapsed;
  const remainingApps = totalAssigned - totalCompleted;
  const estimatedHoursRemaining = appsPerHour > 0 ? remainingApps / appsPerHour : 0;

  // Calculate equity metrics by shift
  const shiftGroups = people.reduce((acc, person) => {
    if (!acc[person.shift_time]) {
      acc[person.shift_time] = [];
    }
    acc[person.shift_time].push(person);
    return acc;
  }, {} as Record<string, SessionPerson[]>);

  const shiftEquity = Object.entries(shiftGroups).map(([shift, members]) => {
    const avgProgress = members.reduce((sum, m) => sum + (m.current_progress / m.assigned_apps) * 100, 0) / members.length;
    const minProgress = Math.min(...members.map(m => (m.current_progress / m.assigned_apps) * 100));
    const maxProgress = Math.max(...members.map(m => (m.current_progress / m.assigned_apps) * 100));
    const variance = maxProgress - minProgress;
    return { shift, avgProgress, variance, isBalanced: variance < 15 };
  });

  const overallBalance = shiftEquity.every(s => s.isBalanced);

  // Identify top performers and those who need support
  const peopleWithRate = people.map(p => ({
    ...p,
    rate: p.current_progress / hoursElapsed,
    progressPercent: (p.current_progress / p.assigned_apps) * 100
  })).sort((a, b) => b.rate - a.rate);

  const avgRate = appsPerHour / people.length;

  return (
    <div className="space-y-4">
      {/* Overall Progress Card */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Progreso General del Día</h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{totalCompleted}/{totalAssigned}</div>
              <div className="text-sm text-muted-foreground">{overallProgress.toFixed(1)}% completado</div>
            </div>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>
      </Card>

      {/* Real-time Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Ritmo Actual</div>
              <div className="text-2xl font-bold">{appsPerHour.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">APPs/hora</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-950 rounded">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Tiempo Estimado</div>
              <div className="text-2xl font-bold">
                {estimatedHoursRemaining < 1 
                  ? `${(estimatedHoursRemaining * 60).toFixed(0)}m` 
                  : `${estimatedHoursRemaining.toFixed(1)}h`}
              </div>
              <div className="text-xs text-muted-foreground">para finalizar</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded ${overallBalance ? 'bg-green-100 dark:bg-green-950' : 'bg-orange-100 dark:bg-orange-950'}`}>
              <Users className={`w-5 h-5 ${overallBalance ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`} />
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Balance del Equipo</div>
              <div className="text-2xl font-bold">
                {overallBalance ? "Balanceado" : "Desbalanceado"}
              </div>
              <div className="text-xs text-muted-foreground">
                {shiftEquity.filter(s => s.isBalanced).length}/{shiftEquity.length} turnos equilibrados
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Equity Analysis by Shift */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Análisis de Equidad por Turno</h3>
        </div>
        <div className="space-y-3">
          {shiftEquity.map(({ shift, avgProgress, variance, isBalanced }) => (
            <div key={shift} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Turno {shift}</span>
                  <Badge variant={isBalanced ? "default" : "secondary"}>
                    {isBalanced ? "Equilibrado" : "Revisar"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Progreso promedio: {avgProgress.toFixed(1)}%
                </div>
              </div>
              <Progress value={avgProgress} className="h-2" />
              {!isBalanced && (
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  Variación de {variance.toFixed(1)}% entre miembros del turno. Considere redistribuir.
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Performance Comparison */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Comparación de Rendimiento</h3>
        <div className="space-y-3">
          {peopleWithRate.map((person, index) => {
            const isAboveAvg = person.rate > avgRate;
            const isBelowAvg = person.rate < avgRate * 0.7;
            return (
              <div key={person.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300' :
                    isAboveAvg ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' :
                    isBelowAvg ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' :
                    'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{person.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Turno {person.shift_time}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{person.rate.toFixed(2)} APPs/h</div>
                  <div className="text-xs text-muted-foreground">
                    {person.progressPercent.toFixed(0)}% completado
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
