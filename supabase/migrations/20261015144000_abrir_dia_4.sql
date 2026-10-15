-- Abre el día 4 (candado manual del profesor): la app abre los días con número <= unlocked_day
update public.ed_config set value = to_jsonb(4) where key = 'unlocked_day';
