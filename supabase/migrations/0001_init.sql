-- Nomad slice 1: sites (locked identity) + site_records (layering of time)

create extension if not exists "pgcrypto";

create table sites (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  state       text not null,
  region      text not null
              check (region in ('pacific','mountain_west','southwest','great_plains','latent')),
  longitude   double precision not null,
  latitude    double precision not null,
  created_at  timestamptz not null default now()
);

create table site_records (
  id                  uuid primary key default gen_random_uuid(),
  site_id             uuid not null references sites(id) on delete cascade,
  year_settled        int,
  year_abandoned      int,
  peak_population     int,
  commodities         text[] not null default '{}',
  mine_size           numeric,
  town_area_acres     numeric,
  notes               text,
  verification_status text not null default 'presumed'
                      check (verification_status in ('presumed','reported','verified','disputed')),
  recorded_at         timestamptz not null default now()
);

create index sites_region_idx on sites (region);
create index site_records_site_id_idx on site_records (site_id);
create index site_records_latest_idx on site_records (site_id, recorded_at desc);

-- Each site joined to its latest record. The atlas reads only this.
create view site_current as
select distinct on (s.id)
  s.id, s.slug, s.name, s.state, s.region, s.longitude, s.latitude,
  r.year_settled, r.year_abandoned, r.peak_population, r.commodities,
  r.mine_size, r.town_area_acres, r.notes, r.verification_status
from sites s
left join site_records r on r.site_id = s.id
order by s.id, r.recorded_at desc;

-- Public read; writes happen only via the service role (seed) for now.
alter table sites enable row level security;
alter table site_records enable row level security;
create policy "public read sites"   on sites        for select using (true);
create policy "public read records" on site_records for select using (true);
