-- Agregar columna is_paused a la tabla session_people
ALTER TABLE public.session_people 
ADD COLUMN is_paused BOOLEAN NOT NULL DEFAULT false;