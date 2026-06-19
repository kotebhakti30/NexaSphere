-- Event Budget Management & Financial Tracking Migration
-- Run this migration to add financial tables to the database

-- Event Budgets table
create table if not exists event_budgets (
  id uuid primary key default gen_random_uuid(),
  event_id text,
  name text not null,
  total_amount numeric(12,2) not null default 0,
  start_date date,
  end_date date,
  category_allocations jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamz not null default now(),
  updated_at timestamz not null default now()
);

create index if not exists idx_event_budgets_event_id on event_budgets (event_id);
create index if not exists idx_event_budgets_created_at on event_budgets (created_at desc);

-- Expenses table
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid references event_budgets(id) on delete cascade,
  event_id text,
  name text not null,
  amount numeric(12,2) not null,
  category text not null default 'Misc',
  receipt_url text,
  status text not null default 'submitted',
  submitted_by text,
  approved_by text,
  created_at timestamz not null default now(),
  updated_at timestamz not null default now()
);

create index if not exists idx_expenses_budget_id on expenses (budget_id);
create index if not exists idx_expenses_status on expenses (status);
create index if not exists idx_expenses_category on expenses (category);

-- Revenue Entries table
create table if not exists revenue_entries (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid references event_budgets(id) on delete cascade,
  event_id text,
  source text not null,
  amount numeric(12,2) not null,
  description text,
  received_at timestamz not null default now(),
  created_by text,
  created_at timestamz not null default now(),
  updated_at timestamz not null default now()
);

create index if not exists idx_revenue_entries_budget_id on revenue_entries (budget_id);
create index if not exists idx_revenue_entries_source on revenue_entries (source);

-- Financial Audit Trail table
create table if not exists financial_audit_trail (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  record_type text not null,
  record_id uuid not null,
  user_id text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamz not null default now()
);

create index if not exists idx_financial_audit_record on financial_audit_trail (record_type, record_id);
create index if not exists idx_financial_audit_user on financial_audit_trail (user_id);
create index if not exists idx_financial_audit_created_at on financial_audit_trail (created_at desc);
