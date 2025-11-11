import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SessionPerson = {
  id: string;
  name: string;
  shift_time: '7am' | '8am' | '9am';
  assigned_apps: number;
  current_progress: number;
};

export type DaySession = {
  id: string;
  total_apps: number;
  date: string;
  started_at: string;
  is_active: boolean;
};

export const useRealtimeSession = () => {
  const [session, setSession] = useState<DaySession | null>(null);
  const [people, setPeople] = useState<SessionPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
      setPeople((data || []).map(p => ({ ...p, shift_time: p.shift_time as '7am' | '8am' | '9am' })));
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

    try {
      const newTotal = session.total_apps + additionalAPPs;
      
      // Atualizar total da sessão
      const { error: sessionError } = await supabase
        .from('day_sessions')
        .update({ total_apps: newTotal })
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      // Ordenar personas por turno
      const sortedPeople = [...people].sort((a, b) => {
        const order = { '7am': 0, '8am': 1, '9am': 2 };
        return order[a.shift_time] - order[b.shift_time];
      });

      // Redistribuir APPs: base igual + remainder por orden de turno
      const totalPeople = sortedPeople.length;
      if (totalPeople > 0) {
        const baseAPPs = Math.floor(newTotal / totalPeople);
        const remainder = newTotal % totalPeople;

        for (let i = 0; i < sortedPeople.length; i++) {
          const person = sortedPeople[i];
          const newTarget = baseAPPs + (i < remainder ? 1 : 0);
          
          await supabase
            .from('session_people')
            .update({ assigned_apps: newTarget })
            .eq('id', person.id);
        }
      }

      toast({
        title: "APPs adicionados!",
        description: `${additionalAPPs} APPs foram redistribuídos.`,
      });
    } catch (error) {
      console.error('Error adding APPs:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar APPs.",
        variant: "destructive",
      });
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
      const tempPeople = [...people, { 
        id: 'temp', 
        name, 
        shift_time: shiftTime, 
        current_progress: 0,
        assigned_apps: 0 
      }];

      // Ordenar por turno
      const sortedPeople = tempPeople.sort((a, b) => {
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
      
      // Eliminar persona
      const { error: deleteError } = await supabase
        .from('session_people')
        .delete()
        .eq('id', personId);

      if (deleteError) throw deleteError;

      // Redistribuir APPs pendientes entre los restantes
      const remainingPeople = people.filter(p => p.id !== personId);
      
      // Ordenar por turno
      const sortedRemaining = remainingPeople.sort((a, b) => {
        const order = { '7am': 0, '8am': 1, '9am': 2 };
        return order[a.shift_time] - order[b.shift_time];
      });

      const totalCompleted = sortedRemaining.reduce((sum, p) => sum + p.current_progress, 0);
      const totalPending = session.total_apps - totalCompleted;
      
      const baseAPPs = Math.floor(totalPending / sortedRemaining.length);
      const remainder = totalPending % sortedRemaining.length;

      for (let i = 0; i < sortedRemaining.length; i++) {
        const person = sortedRemaining[i];
        const extraAPPs = baseAPPs + (i < remainder ? 1 : 0);
        const newTarget = person.current_progress + extraAPPs;
        
        await supabase
          .from('session_people')
          .update({ assigned_apps: newTarget })
          .eq('id', person.id);
      }

      toast({
        title: "Participante removido",
        description: "APPs foram redistribuídos.",
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
  };
};