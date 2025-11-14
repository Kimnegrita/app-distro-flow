import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SessionPerson = {
  id: string;
  name: string;
  shift_time: '7am' | '8am' | '9am';
  assigned_apps: number;
  current_progress: number;
  is_paused: boolean;
};

export type DaySession = {
  id: string;
  total_apps: number;
  date: string;
  started_at: string;
  is_active: boolean;
};

// Helper function to check if a person's shift has ended
const hasShiftEnded = (shiftTime: '7am' | '8am' | '9am'): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Shift end times in minutes from midnight
  const shiftEndTimes = {
    '7am': 16 * 60,  // 4:00 PM (16:00)
    '8am': 17 * 60,  // 5:00 PM (17:00)
    '9am': 18 * 60,  // 6:00 PM (18:00)
  };

  return currentTimeInMinutes >= shiftEndTimes[shiftTime];
};

export const useRealtimeSession = () => {
  const [session, setSession] = useState<DaySession | null>(null);
  const [people, setPeople] = useState<SessionPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const addingAppsRef = useRef(false);

  // Cargar sesión activa al inicio
  useEffect(() => {
    loadActiveSession();
  }, []);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const sessionChannel = supabase
      .channel('day-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'day_sessions',
          filter: 'is_active=eq.true'
        },
        (payload) => {
          console.log('Session change:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setSession(payload.new as DaySession);
          } else if (payload.eventType === 'DELETE') {
            setSession(null);
            setPeople([]);
          }
        }
      )
      .subscribe();

    const peopleChannel = supabase
      .channel('session-people-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_people'
        },
        async (payload) => {
          console.log('People change:', payload);
          if (session) {
            await loadSessionPeople(session.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(peopleChannel);
    };
  }, [session?.id]);

  const loadActiveSession = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('day_sessions')
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (sessionData) {
        setSession(sessionData);
        await loadSessionPeople(sessionData.id);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a sessão ativa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSessionPeople = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('session_people')
        .select('*')
        .eq('session_id', sessionId)
        .order('shift_time', { ascending: true });

      if (error) throw error;
      setPeople((data || []).map(p => ({ 
        ...p, 
        shift_time: p.shift_time as '7am' | '8am' | '9am',
        is_paused: (p as any).is_paused ?? false
      })));
    } catch (error) {
      console.error('Error loading people:', error);
    }
  };

  const startSession = async (
    totalAPPs: number,
    peopleData: Array<{ name: string; shift_time: '7am' | '8am' | '9am' }>
  ) => {
    try {
      // Desactivar sesiones anteriores
      await supabase
        .from('day_sessions')
        .update({ is_active: false })
        .eq('is_active', true);

      // Crear nueva sesión
      const { data: newSession, error: sessionError } = await supabase
        .from('day_sessions')
        .insert({
          total_apps: totalAPPs,
          is_active: true,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Ordenar personas por turno (7am, 8am, 9am)
      const sortedPeople = [...peopleData].sort((a, b) => {
        const order = { '7am': 0, '8am': 1, '9am': 2 };
        return order[a.shift_time] - order[b.shift_time];
      });

      // Distribuir base igual para todos
      const totalPeople = sortedPeople.length;
      const baseAPPs = Math.floor(totalAPPs / totalPeople);
      const remainder = totalAPPs % totalPeople;

      const insertData = sortedPeople.map((person, index) => ({
        session_id: newSession.id,
        name: person.name,
        shift_time: person.shift_time,
        assigned_apps: baseAPPs + (index < remainder ? 1 : 0),
        current_progress: 0,
      }));

      const { error: peopleError } = await supabase
        .from('session_people')
        .insert(insertData);

      if (peopleError) throw peopleError;

      toast({
        title: "Jornada iniciada!",
        description: "Todos podem ver e registrar progresso em tempo real.",
      });

      setSession(newSession);
      await loadSessionPeople(newSession.id);
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a jornada.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProgress = async (personId: string, newProgress: number) => {
    try {
      const { error } = await supabase
        .from('session_people')
        .update({ current_progress: newProgress })
        .eq('id', personId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o progresso.",
        variant: "destructive",
      });
    }
  };

  const addMoreAPPs = async (additionalAPPs: number) => {
    if (!session) return;

    // Evitar dobles clics o llamadas simultáneas
    if (addingAppsRef.current) {
      return;
    }
    addingAppsRef.current = true;

    try {
      const toAdd = Math.floor(additionalAPPs);
      if (!Number.isFinite(toAdd) || toAdd <= 0) {
        toast({
          title: "Aviso",
          description: "Quantidade inválida de APPs para adicionar.",
          variant: "destructive",
        });
        return;
      }

      const newTotal = session.total_apps + toAdd;
      
      // Atualizar total da sessão
      const { error: sessionError } = await supabase
        .from('day_sessions')
        .update({ total_apps: newTotal })
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      // Ordenar personas por turno y filtrar las que no están en pausa o cuyo turno ha terminado
      const sortedPeople = [...people]
        .filter(p => !p.is_paused && !hasShiftEnded(p.shift_time))
        .sort((a, b) => {
          const order = { '7am': 0, '8am': 1, '9am': 2 } as const;
          return order[a.shift_time] - order[b.shift_time];
        });

      // Distribuir SOLO los APPs adicionales entre las personas activas
      const totalPeople = sortedPeople.length;
      if (totalPeople > 0) {
        const baseAPPs = Math.floor(toAdd / totalPeople);
        const remainder = toAdd % totalPeople;

        // Ejecutar actualizaciones en paralelo para minimizar el tiempo de ventana
        await Promise.all(sortedPeople.map((person, i) => {
          const additionalForPerson = baseAPPs + (i < remainder ? 1 : 0);
          if (additionalForPerson === 0) return Promise.resolve();
          const newTarget = person.assigned_apps + additionalForPerson;
          return supabase
            .from('session_people')
            .update({ assigned_apps: newTarget })
            .eq('id', person.id);
        }));
      }

      toast({
        title: "APPs adicionados!",
        description: `${toAdd} APPs foram distribuídos.`,
      });
    } catch (error) {
      console.error('Error adding APPs:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar APPs.",
        variant: "destructive",
      });
    } finally {
      addingAppsRef.current = false;
    }
  };

  const addPerson = async (name: string, shiftTime: '7am' | '8am' | '9am') => {
    if (!session) return;

    try {
      // Verificar se a pessoa já existe
      if (people.some(p => p.name === name)) {
        toast({
          title: "Aviso",
          description: `${name} já está na lista.`,
          variant: "destructive",
        });
        return;
      }

      // Calcular APPs pendientes totales
      const totalCompleted = people.reduce((sum, p) => sum + p.current_progress, 0);
      const totalPending = session.total_apps - totalCompleted;
      
      // Crear lista temporal con nueva persona
      const tempPeople: SessionPerson[] = [...people, { 
        id: 'temp', 
        name, 
        shift_time: shiftTime, 
        current_progress: 0,
        assigned_apps: 0,
        is_paused: false
      }];

      // Ordenar por turno y filtrar las que no están en pausa o cuyo turno ha terminado
      const sortedPeople = tempPeople
        .filter(p => p.id === 'temp' || (!p.is_paused && !hasShiftEnded(p.shift_time)))
        .sort((a, b) => {
          const order = { '7am': 0, '8am': 1, '9am': 2 };
          return order[a.shift_time] - order[b.shift_time];
        });

      // Calcular distribución base + remainder
      const newTotalPeople = sortedPeople.length;
      const baseAPPs = Math.floor(totalPending / newTotalPeople);
      const remainder = totalPending % newTotalPeople;

      // Actualizar personas existentes
      for (let i = 0; i < sortedPeople.length; i++) {
        const person = sortedPeople[i];
        if (person.id !== 'temp') {
          const extraAPPs = baseAPPs + (i < remainder ? 1 : 0);
          const newTarget = person.current_progress + extraAPPs;
          
          await supabase
            .from('session_people')
            .update({ assigned_apps: newTarget })
            .eq('id', person.id);
        }
      }

      // Agregar nueva persona con su asignación
      const newPersonIndex = sortedPeople.findIndex(p => p.id === 'temp');
      const newPersonTarget = baseAPPs + (newPersonIndex < remainder ? 1 : 0);
      
      const { error } = await supabase
        .from('session_people')
        .insert({
          session_id: session.id,
          name,
          shift_time: shiftTime,
          assigned_apps: newPersonTarget,
          current_progress: 0,
        });

      if (error) throw error;

      toast({
        title: "Participante adicionado!",
        description: `${name} foi adicionado ao turno ${shiftTime}.`,
      });
    } catch (error) {
      console.error('Error adding person:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar participante.",
        variant: "destructive",
      });
    }
  };

  const removePerson = async (personId: string) => {
    if (!session || people.length <= 1) {
      toast({
        title: "Aviso",
        description: "Deve haver pelo menos uma pessoa na jornada.",
        variant: "destructive",
      });
      return;
    }

    try {
      const personToRemove = people.find(p => p.id === personId);
      if (!personToRemove) return;
      
      // Calcular APPs pendientes de la persona a eliminar
      const pendingAPPs = personToRemove.assigned_apps - personToRemove.current_progress;
      
      // Eliminar persona
      const { error: deleteError } = await supabase
        .from('session_people')
        .delete()
        .eq('id', personId);

      if (deleteError) throw deleteError;

      // Solo redistribuir si hay APPs pendientes
      if (pendingAPPs > 0) {
        // Redistribuir APPs pendientes entre los restantes que no están en pausa y cuyo turno no ha terminado
        const remainingPeople = people.filter(p => p.id !== personId && !p.is_paused && !hasShiftEnded(p.shift_time));
        
        if (remainingPeople.length > 0) {
          // Ordenar por turno
          const sortedRemaining = remainingPeople.sort((a, b) => {
            const order = { '7am': 0, '8am': 1, '9am': 2 };
            return order[a.shift_time] - order[b.shift_time];
          });

          const baseAPPs = Math.floor(pendingAPPs / sortedRemaining.length);
          const remainder = pendingAPPs % sortedRemaining.length;

          for (let i = 0; i < sortedRemaining.length; i++) {
            const person = sortedRemaining[i];
            const extraAPPs = baseAPPs + (i < remainder ? 1 : 0);
            const newTarget = person.assigned_apps + extraAPPs;
            
            await supabase
              .from('session_people')
              .update({ assigned_apps: newTarget })
              .eq('id', person.id);
          }
        }
      }

      toast({
        title: "Participante removido",
        description: pendingAPPs > 0 ? "APPs pendentes foram redistribuídos." : "Participante removido com sucesso.",
      });
    } catch (error) {
      console.error('Error removing person:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover participante.",
        variant: "destructive",
      });
    }
  };

  const resetSession = async () => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('day_sessions')
        .update({ is_active: false })
        .eq('id', session.id);

      if (error) throw error;

      setSession(null);
      setPeople([]);
      
      toast({
        title: "Jornada reiniciada",
        description: "Uma nova jornada pode ser iniciada.",
      });
    } catch (error) {
      console.error('Error resetting session:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reiniciar a jornada.",
        variant: "destructive",
      });
    }
  };

  const updateShift = async (personId: string, newShiftTime: '7am' | '8am' | '9am') => {
    if (!session) return;

    try {
      // Actualizar el turno de la persona
      const { error: updateError } = await supabase
        .from('session_people')
        .update({ shift_time: newShiftTime })
        .eq('id', personId);

      if (updateError) throw updateError;

      // Obtener lista actualizada de personas
      const updatedPeople = people.map(p => 
        p.id === personId ? { ...p, shift_time: newShiftTime } : p
      );

      // Ordenar por turno
      const sortedPeople = updatedPeople.sort((a, b) => {
        const order = { '7am': 0, '8am': 1, '9am': 2 };
        return order[a.shift_time] - order[b.shift_time];
      });

      // Calcular APPs pendientes totales
      const totalCompleted = sortedPeople.reduce((sum, p) => sum + p.current_progress, 0);
      const totalPending = session.total_apps - totalCompleted;

      // Redistribuir APPs pendientes: base igual + remainder por orden de turno
      const baseAPPs = Math.floor(totalPending / sortedPeople.length);
      const remainder = totalPending % sortedPeople.length;

      for (let i = 0; i < sortedPeople.length; i++) {
        const person = sortedPeople[i];
        const extraAPPs = baseAPPs + (i < remainder ? 1 : 0);
        const newTarget = person.current_progress + extraAPPs;
        
        await supabase
          .from('session_people')
          .update({ assigned_apps: newTarget })
          .eq('id', person.id);
      }

      toast({
        title: "Turno atualizado",
        description: "APPs foram redistribuídos.",
      });
    } catch (error) {
      console.error('Error updating shift:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o turno.",
        variant: "destructive",
      });
    }
  };

  const updateAssignedAPPs = async (personId: string, change: number) => {
    if (!session) return;

    try {
      const person = people.find(p => p.id === personId);
      if (!person) return;

      const newAssigned = person.assigned_apps + change;
      
      // No permitir asignación menor al progreso actual
      if (newAssigned < person.current_progress) {
        toast({
          title: "Aviso",
          description: "Não é possível atribuir menos APPs do que o progresso atual.",
          variant: "destructive",
        });
        return;
      }

      // Actualizar assigned_apps de la persona
      const { error: updateError } = await supabase
        .from('session_people')
        .update({ assigned_apps: newAssigned })
        .eq('id', personId);

      if (updateError) throw updateError;

      // Actualizar total de la sesión
      const newTotal = session.total_apps + change;
      const { error: sessionError } = await supabase
        .from('day_sessions')
        .update({ total_apps: newTotal })
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      toast({
        title: "APPs ajustados",
        description: `${change > 0 ? '+' : ''}${change} APPs para ${person.name}.`,
      });
    } catch (error) {
      console.error('Error updating assigned APPs:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ajustar APPs.",
        variant: "destructive",
      });
    }
  };

  const togglePause = async (personId: string) => {
    if (!session) return;

    try {
      const person = people.find(p => p.id === personId);
      if (!person) return;

      const newPausedState = !person.is_paused;

      // Actualizar estado de pausa
      const { error: updateError } = await supabase
        .from('session_people')
        .update({ is_paused: newPausedState } as any)
        .eq('id', personId);

      if (updateError) throw updateError;

      // Si se está despausando, redistribuir APPs
      if (!newPausedState) {
        // Filtrar personas activas (no en pausa y cuyo turno no ha terminado)
        const activePeople = people
          .map(p => p.id === personId ? { ...p, is_paused: false } : p)
          .filter(p => !p.is_paused && !hasShiftEnded(p.shift_time));

        // Ordenar por turno
        const sortedActive = activePeople.sort((a, b) => {
          const order = { '7am': 0, '8am': 1, '9am': 2 };
          return order[a.shift_time] - order[b.shift_time];
        });

        // Calcular APPs pendientes totales
        const totalCompleted = sortedActive.reduce((sum, p) => sum + p.current_progress, 0);
        const totalPending = session.total_apps - totalCompleted;

        // Redistribuir APPs pendientes
        const baseAPPs = Math.floor(totalPending / sortedActive.length);
        const remainder = totalPending % sortedActive.length;

        for (let i = 0; i < sortedActive.length; i++) {
          const p = sortedActive[i];
          const extraAPPs = baseAPPs + (i < remainder ? 1 : 0);
          const newTarget = p.current_progress + extraAPPs;

          await supabase
            .from('session_people')
            .update({ assigned_apps: newTarget })
            .eq('id', p.id);
        }
      }

      toast({
        title: newPausedState ? "Pausa ativada" : "Pausa desativada",
        description: newPausedState 
          ? `${person.name} está em pausa e não receberá APPs.`
          : `${person.name} voltou ao trabalho. APPs redistribuídos.`,
      });
    } catch (error) {
      console.error('Error toggling pause:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o estado de pausa.",
        variant: "destructive",
      });
    }
  };

  return {
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
    togglePause,
  };
};