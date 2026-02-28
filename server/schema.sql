create type user_role as enum ('admin', 'receptionist', 'doctor');
create type appointment_status as enum ('scheduled', 'cancelled', 'arrived', 'no_show');

create table if not exists users (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role user_role not null default 'receptionist',
  created_at timestamptz not null default now()
);

create table if not exists patients (
  id bigint generated always as identity primary key,
  full_name text not null,
  tc text not null unique,
  phone text not null,
  birth_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id bigint generated always as identity primary key,
  patient_id bigint not null references patients(id) on delete cascade,
  doctor_id bigint not null references users(id) on delete restrict,
  start_time timestamptz not null,
  status appointment_status not null default 'scheduled',
  unique (doctor_id, start_time),
  created_at timestamptz not null default now()
);

create index if not exists idx_patients_full_name on patients using gin (to_tsvector('simple', full_name));
create index if not exists idx_patients_tc on patients (tc);
create index if not exists idx_patients_phone on patients (phone);
create index if not exists idx_appointments_start_time on appointments (start_time);
create index if not exists idx_appointments_doctor_start_time on appointments (doctor_id, start_time);
