do $$
begin
  if exists (select 1 from pg_type where typname = 'appointment_status') then
    alter type appointment_status add value if not exists 'completed';
  end if;
end $$;

create index if not exists idx_appointments_status on appointments (status);

