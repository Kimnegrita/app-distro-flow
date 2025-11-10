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

      // Distribuir APPs por turnos
      const peopleByShift = {
        '7am': peopleData.filter(p => p.shift_time === '7am'),
        '8am': peopleData.filter(p => p.shift_time === '8am'),
        '9am': peopleData.filter(p => p.shift_time === '9am'),
      };

      const shifts = ['7am', '8am', '9am'] as const;
      const appsPerShift = Math.floor(totalAPPs / 3);
      const remainder = totalAPPs % 3;

      const insertData = [];

      for (let i = 0; i < shifts.length; i++) {
        const shift = shifts[i];
        const shiftPeople = peopleByShift[shift];
        const shiftAPPs = appsPerShift + (i < remainder ? 1 : 0);

        if (shiftPeople.length > 0) {
          const appsPerPerson = Math.floor(shiftAPPs / shiftPeople.length);
          const personRemainder = shiftAPPs % shiftPeople.length;

          shiftPeople.forEach((person, index) => {
            insertData.push({
              session_id: newSession.id,
              name: person.name,
              shift_time: shift,
              assigned_apps: appsPerPerson + (index < personRemainder ? 1 : 0),
              current_progress: 0,
            });
          });
        }
      }

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

      // Redistribuir APPs
      const totalPeople = people.length;
      if (totalPeople > 0) {
        const appsPerPerson = Math.floor(newTotal / totalPeople);
        const remainder = newTotal % totalPeople;

        for (let i = 0; i < people.length; i++) {
          const person = people[i];
          const newTarget = appsPerPerson + (i < remainder ? 1 : 0);
          
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

      // Calcular APPs pendentes
      const totalCompleted = people.reduce((sum, p) => sum + p.current_progress, 0);
      const pendingAPPs = session.total_apps - totalCompleted;
      const newTotalPeople = people.length + 1;
      const appsPerPerson = Math.floor(pendingAPPs / newTotalPeople);
      const remainder = pendingAPPs % newTotalPeople;

      // Redistribuir APPs entre todos
      for (let i = 0; i < people.length; i++) {
        const person = people[i];
        const newTarget = person.current_progress + appsPerPerson + (i < remainder ? 1 : 0);
        
        await supabase
          .from('session_people')
          .update({ assigned_apps: newTarget })
          .eq('id', person.id);
      }

      // Agregar nueva persona
      const newPersonTarget = appsPerPerson + (people.length < remainder ? 1 : 0);
      
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

      const pendingFromRemoved = Math.max(0, personToRemove.assigned_apps - personToRemove.current_progress);
      
      // Eliminar persona
      const { error: deleteError } = await supabase
        .from('session_people')
        .delete()
        .eq('id', personId);

      if (deleteError) throw deleteError;

      // Redistribuir APPs pendientes
      const remainingPeople = people.filter(p => p.id !== personId);
      const totalCompleted = remainingPeople.reduce((sum, p) => sum + p.current_progress, 0);
      const totalPending = session.total_apps - totalCompleted;
      
      const appsPerPerson = Math.floor(totalPending / remainingPeople.length);
      const remainder = totalPending % remainingPeople.length;

      for (let i = 0; i < remainingPeople.length; i++) {
        const person = remainingPeople[i];
        const newTarget = person.current_progress + appsPerPerson + (i < remainder ? 1 : 0);
        
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
  };
};