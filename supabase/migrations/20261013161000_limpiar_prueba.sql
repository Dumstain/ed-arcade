-- Limpia la fila de prueba de humo creada al verificar RLS
delete from public.ed_attempts where control = '00000000';
