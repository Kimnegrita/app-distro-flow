-- Tabla para sesiones de trabajo diarias
CREATE TABLE public.day_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_apps INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para personas en turno con sus progresos
CREATE TABLE public.session_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.day_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shift_time TEXT NOT NULL CHECK (shift_time IN ('7am', '8am', '9am')),
  assigned_apps INTEGER NOT NULL,
  current_progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para appeals/revisiones
CREATE TABLE public.appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES public.session_people(id) ON DELETE CASCADE,
  review_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.day_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

-- Políticas para acceso público (todos pueden ver y modificar durante la jornada)
CREATE POLICY "Anyone can view day sessions" 
ON public.day_sessions FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert day sessions" 
ON public.day_sessions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update day sessions" 
ON public.day_sessions FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can view session people" 
ON public.session_people FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert session people" 
ON public.session_people FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update session people" 
ON public.session_people FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete session people" 
ON public.session_people FOR DELETE 
USING (true);

CREATE POLICY "Anyone can view appeals" 
ON public.appeals FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert appeals" 
ON public.appeals FOR INSERT 
WITH CHECK (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_day_sessions_updated_at
BEFORE UPDATE ON public.day_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_people_updated_at
BEFORE UPDATE ON public.session_people
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para sincronización en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.day_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_people;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appeals;