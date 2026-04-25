alter table public.contractors
add column if not exists measurement_system text not null default 'metric';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contractors_measurement_system_check'
      and conrelid = 'public.contractors'::regclass
  ) then
    alter table public.contractors
    add constraint contractors_measurement_system_check
    check (measurement_system in ('metric', 'imperial'));
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'products_unit_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products drop constraint products_unit_check;
  end if;

  alter table public.products
  add constraint products_unit_check
  check (unit in ('lineal metre', 'metre squared', 'lineal foot', 'square foot', 'each'));
end;
$$;
