-- Optional Sprint 2 sample seed data for appointments.
-- Prerequisite: at least one doctor in users and one patient in patients.

insert into appointments (patient_id, doctor_id, start_time, status)
select p.id, d.id, now() + interval '1 day', 'scheduled'::appointment_status
from patients p
join users d on d.role = 'doctor'
where p.id = (select min(id) from patients)
  and d.id = (select min(id) from users where role = 'doctor')
on conflict (doctor_id, start_time) do nothing;

insert into appointments (patient_id, doctor_id, start_time, status)
select p.id, d.id, now() + interval '2 days', 'scheduled'::appointment_status
from patients p
join users d on d.role = 'doctor'
where p.id = (select min(id) from patients)
  and d.id = (select min(id) from users where role = 'doctor')
on conflict (doctor_id, start_time) do nothing;

