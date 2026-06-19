-- Content Moderation Queue Migration
-- Run this migration to add moderation tables to the database

-- Moderation Flags table
create table if not exists moderation_flags (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id text not null,
  content_preview text,
  user_id text not null,
  reported_by text,
  flag_type text not null,
  reason text,
  severity text not null default 'medium',
  status text not null default 'pending',
  moderator_id text,
  resolution text,
  resolution_note text,
  created_at timestamz not null default now(),
  resolved_at timestamz
);

create index if not exists idx_moderation_flags_status on moderation_flags (status);
create index if not exists idx_moderation_flags_user_id on moderation_flags (user_id);
create index if not exists idx_moderation_flags_flag_type on moderation_flags (flag_type);
create index if not exists idx_moderation_flags_created_at on moderation_flags (created_at desc);
create index if not exists idx_moderation_flags_content on moderation_flags (content_type, content_id);

-- User Warnings table
create table if not exists moderation_user_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  warning_level integer not null default 1,
  reason text not null,
  issued_by text,
  expires_at timestamz,
  created_at timestamz not null default now()
);

create index if not exists idx_moderation_warnings_user_id on moderation_user_warnings (user_id);
create index if not exists idx_moderation_warnings_level on moderation_user_warnings (warning_level);

-- Moderator Notes table
create table if not exists moderation_notes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text not null,
  note text not null,
  created_by text,
  created_at timestamz not null default now()
);

create index if not exists idx_moderation_notes_target on moderation_notes (target_type, target_id);

-- Appeals table
create table if not exists moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null references moderation_flags(id) on delete cascade,
  user_id text not null,
  reason text not null,
  status text not null default 'pending',
  reviewed_by text,
  decision text,
  decision_note text,
  created_at timestamz not null default now(),
  resolved_at timestamz
);

create index if not exists idx_moderation_appeals_status on moderation_appeals (status);
create index if not exists idx_moderation_appeals_flag_id on moderation_appeals (flag_id);
create index if not exists idx_moderation_appeals_user_id on moderation_appeals (user_id);
