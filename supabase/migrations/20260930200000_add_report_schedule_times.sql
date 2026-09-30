alter table public.rapports
  add column if not exists heure_arrivee text,
  add column if not exists heure_sortie text;
