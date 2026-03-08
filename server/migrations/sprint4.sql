create table if not exists prescriptions (
  id bigint generated always as identity primary key,
  patient_id bigint not null references patients(id) on delete cascade,
  doctor_id bigint not null references users(id) on delete restrict,
  appointment_id bigint references appointments(id) on delete set null,
  medication text not null,
  dosage text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_prescriptions_patient on prescriptions (patient_id);
create index if not exists idx_prescriptions_doctor on prescriptions (doctor_id);
create index if not exists idx_prescriptions_created_at on prescriptions (created_at);

