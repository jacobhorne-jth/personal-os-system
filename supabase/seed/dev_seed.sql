insert into public.profiles (id, display_name, timezone)
values ('00000000-0000-0000-0000-000000000001', 'Jacob', 'America/Los_Angeles')
on conflict (id) do nothing;

insert into public.responsibilities (user_id, name, slug, description, color, icon, weekly_goal_minutes, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', 'School', 'school', 'Classes, assignments, exams, and academic deadlines.', 'blue', 'GraduationCap', 1080, 1),
  ('00000000-0000-0000-0000-000000000001', 'DLL Research', 'dll-research', 'Runtime analysis, experiments, papers, and lab meetings.', 'mint', 'Microscope', 600, 2),
  ('00000000-0000-0000-0000-000000000001', 'Calit2', 'calit2', 'Project work, admin, and collaboration windows.', 'violet', 'Building2', 480, 3),
  ('00000000-0000-0000-0000-000000000001', 'Capital One', 'capital-one', 'Recruiting prep, interviews, and follow-ups.', 'coral', 'BriefcaseBusiness', 300, 4),
  ('00000000-0000-0000-0000-000000000001', 'Health', 'health', 'Training, sleep, appointments, meals, and recovery.', 'amber', 'HeartPulse', 360, 5)
on conflict (user_id, slug) do nothing;
