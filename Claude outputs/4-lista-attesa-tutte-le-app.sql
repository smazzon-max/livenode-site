-- Lista d'attesa di LiveNode per TUTTE le app (sito nuovo, novembre 2026).
-- Da incollare in Supabase → SQL Editor → Run. Si può rilanciare senza problemi.
-- Il sito può solo AGGIUNGERE un'email: nessuno può leggere la lista dal sito.
-- Le iscrizioni le vedi in Supabase → Table Editor → waitlist (colonna «app» = da quale pagina).
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  app text not null default 'livenode',
  email text not null check (char_length(email) <= 160 and email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  lang text check (lang in ('en', 'it')),
  created_at timestamptz not null default now(),
  unique (app, email)
);

-- prima la tabella accettava solo «clips»: ora tutte le app
alter table public.waitlist alter column app set default 'livenode';
alter table public.waitlist drop constraint if exists waitlist_app_check;
alter table public.waitlist add constraint waitlist_app_check
  check (app in ('livenode', 'camera', 'dock', 'cloud', 'clips'));

alter table public.waitlist enable row level security;
drop policy if exists "waitlist: iscrizione dal sito" on public.waitlist;
create policy "waitlist: iscrizione dal sito" on public.waitlist
  for insert to anon, authenticated
  with check (app in ('livenode', 'camera', 'dock', 'cloud', 'clips'));

revoke all on public.waitlist from anon, authenticated;
grant insert on public.waitlist to anon, authenticated;
