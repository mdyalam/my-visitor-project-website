
---

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone https://github.com/mdyalam/my-visitor-project-website
   cd my-visitor-project-website
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
---

## SQL

```sh
create table public.hosts (
id text not null,
name text not null,
email text null,
phone text null,
created_at timestamp with time zone null default now(),
constraint hosts_pkey primary key (id)
) TABLESPACE pg_default;

create table public.visitors (
  id uuid not null default gen_random_uuid (),
  name character varying(255) not null,
  vehicle_number character varying(20) not null,
  phone character varying(15) null,
  purpose text null,
  photo_url text null,
  check_in_time timestamp with time zone null,
  check_out_time timestamp with time zone null,
  status character varying(20) null default 'checked_in'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  host character varying(100) null,
  company_name text null,
  company_address text null,
  photo_id_type text null,
  photo_id_number text null,
  from_date date null,
  to_date date null,
  visitor_type text null,
  assets text[] null,
  special_permissions text[] null,
  creche text null,
  remarks text null,
  email text null,
  constraint visitors_pkey primary key (id)
) TABLESPACE pg_default;



create table public.visitor_logs (
  id uuid not null default gen_random_uuid (),
  visitor_id uuid null,
  action text not null,
  timestamp timestamp with time zone not null default now(),
  constraint visitor_logs_pkey primary key (id),
  constraint visitor_logs_visitor_id_fkey foreign KEY (visitor_id) references visitors (id) on delete CASCADE
) TABLESPACE pg_default;


```
---
