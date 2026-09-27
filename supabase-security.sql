-- Run this once in Supabase SQL Editor after creating the tables.
-- It creates profiles automatically and protects tables from public access.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, student_id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'MRH User'),
    new.raw_user_meta_data->>'student_id',
    'student'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    student_id = excluded.student_id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.submissions enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "Users can view their profile" on public.profiles;
create policy "Users can view their profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

drop policy if exists "Users can create their profile" on public.profiles;
create policy "Users can create their profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update to authenticated
using (auth.uid() = id);

-- Authenticated users can read published exams; teachers/admins can create exams.
drop policy if exists "Authenticated users can view exams" on public.exams;
create policy "Authenticated users can view exams"
on public.exams for select to authenticated
using (status = 'published' or created_by = auth.uid());

drop policy if exists "Authenticated users can create exams" on public.exams;
create policy "Authenticated users can create exams"
on public.exams for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists "Creators can update exams" on public.exams;
create policy "Creators can update exams"
on public.exams for update to authenticated
using (created_by = auth.uid());

drop policy if exists "Students can submit exams" on public.submissions;
create policy "Students can submit exams"
on public.submissions for insert to authenticated
with check (student_id = auth.uid());

drop policy if exists "Students can view their submissions" on public.submissions;
create policy "Students can view their submissions"
on public.submissions for select to authenticated
using (student_id = auth.uid());

create policy "Authenticated users can view questions"
on public.questions for select to authenticated
using (true);

create policy "Authenticated users can view attendance"
on public.attendance for select to authenticated
using (student_id = auth.uid());

-- Create a public bucket for teacher question PDFs.
insert into storage.buckets (id, name, public)
values ('exam-pdfs', 'exam-pdfs', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload exam PDFs" on storage.objects;
create policy "Authenticated users can upload exam PDFs"
on storage.objects for insert to authenticated
with check (bucket_id = 'exam-pdfs');

drop policy if exists "Anyone can view exam PDFs" on storage.objects;
create policy "Anyone can view exam PDFs"
on storage.objects for select to public
using (bucket_id = 'exam-pdfs');
