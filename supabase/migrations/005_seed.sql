-- ============================================================
-- Migration 005: Seed Data
-- SkillSwap V2
-- Run AFTER 004_triggers.sql
-- ============================================================

-- ─── Categories ──────────────────────────────────────────────
insert into public.categories (slug, name, icon) values
  ('muzik',     'Müzik',       'music_note'),
  ('yazilim',   'Yazılım',     'code'),
  ('tasarim',   'Tasarım',     'palette'),
  ('spor',      'Spor',        'sports_soccer'),
  ('dil',       'Dil Öğrenimi','language'),
  ('sanat',     'Sanat',       'brush'),
  ('matematik', 'Matematik',   'calculate'),
  ('diger',     'Diğer',       'more_horiz')
on conflict (slug) do nothing;

-- ─── Starter Skills ──────────────────────────────────────────
-- Müzik
insert into public.skills (id, category_id, name, slug) values
  (gen_random_uuid(), (select id from public.categories where slug='muzik'), 'Akustik Gitar',    'akustik-gitar'),
  (gen_random_uuid(), (select id from public.categories where slug='muzik'), 'Elektro Gitar',    'elektro-gitar'),
  (gen_random_uuid(), (select id from public.categories where slug='muzik'), 'Piyano',            'piyano'),
  (gen_random_uuid(), (select id from public.categories where slug='muzik'), 'Davul',             'davul'),
  (gen_random_uuid(), (select id from public.categories where slug='muzik'), 'Vokal',             'vokal'),
  (gen_random_uuid(), (select id from public.categories where slug='muzik'), 'Müzik Teorisi',    'muzik-teorisi')
on conflict (slug) do nothing;

-- Yazılım
insert into public.skills (id, category_id, name, slug) values
  (gen_random_uuid(), (select id from public.categories where slug='yazilim'), 'Python',           'python'),
  (gen_random_uuid(), (select id from public.categories where slug='yazilim'), 'JavaScript',       'javascript'),
  (gen_random_uuid(), (select id from public.categories where slug='yazilim'), 'HTML & CSS',       'html-css'),
  (gen_random_uuid(), (select id from public.categories where slug='yazilim'), 'React',            'react'),
  (gen_random_uuid(), (select id from public.categories where slug='yazilim'), 'Oyun Geliştirme',  'oyun-gelistirme'),
  (gen_random_uuid(), (select id from public.categories where slug='yazilim'), 'Veri Analizi',     'veri-analizi')
on conflict (slug) do nothing;

-- Tasarım
insert into public.skills (id, category_id, name, slug) values
  (gen_random_uuid(), (select id from public.categories where slug='tasarim'), 'Figma',            'figma'),
  (gen_random_uuid(), (select id from public.categories where slug='tasarim'), 'Procreate',        'procreate'),
  (gen_random_uuid(), (select id from public.categories where slug='tasarim'), 'Photoshop',        'photoshop'),
  (gen_random_uuid(), (select id from public.categories where slug='tasarim'), 'Grafik Tasarım',   'grafik-tasarim'),
  (gen_random_uuid(), (select id from public.categories where slug='tasarim'), 'İllüstrasyon',     'ilustrasyon')
on conflict (slug) do nothing;

-- Spor
insert into public.skills (id, category_id, name, slug) values
  (gen_random_uuid(), (select id from public.categories where slug='spor'), 'Futbol',             'futbol'),
  (gen_random_uuid(), (select id from public.categories where slug='spor'), 'Basketbol',          'basketbol'),
  (gen_random_uuid(), (select id from public.categories where slug='spor'), 'Yoga',               'yoga'),
  (gen_random_uuid(), (select id from public.categories where slug='spor'), 'Street Dance',       'street-dance'),
  (gen_random_uuid(), (select id from public.categories where slug='spor'), 'Yüzme',              'yuzme')
on conflict (slug) do nothing;

-- Dil
insert into public.skills (id, category_id, name, slug) values
  (gen_random_uuid(), (select id from public.categories where slug='dil'), 'İngilizce',           'ingilizce'),
  (gen_random_uuid(), (select id from public.categories where slug='dil'), 'Almanca',             'almanca'),
  (gen_random_uuid(), (select id from public.categories where slug='dil'), 'Fransızca',           'fransizca'),
  (gen_random_uuid(), (select id from public.categories where slug='dil'), 'İspanyolca',          'ispanyolca'),
  (gen_random_uuid(), (select id from public.categories where slug='dil'), 'Japonca',             'japonca')
on conflict (slug) do nothing;

-- Sanat
insert into public.skills (id, category_id, name, slug) values
  (gen_random_uuid(), (select id from public.categories where slug='sanat'), 'Resim',              'resim'),
  (gen_random_uuid(), (select id from public.categories where slug='sanat'), 'Heykel',             'heykel'),
  (gen_random_uuid(), (select id from public.categories where slug='sanat'), 'Fotoğrafçılık',      'fotografcilik'),
  (gen_random_uuid(), (select id from public.categories where slug='sanat'), 'Video Düzenleme',    'video-duzenleme')
on conflict (slug) do nothing;

-- Matematik
insert into public.skills (id, category_id, name, slug) values
  (gen_random_uuid(), (select id from public.categories where slug='matematik'), 'TYT Matematik',  'tyt-matematik'),
  (gen_random_uuid(), (select id from public.categories where slug='matematik'), 'AYT Matematik',  'ayt-matematik'),
  (gen_random_uuid(), (select id from public.categories where slug='matematik'), 'Fizik',           'fizik'),
  (gen_random_uuid(), (select id from public.categories where slug='matematik'), 'Kimya',           'kimya')
on conflict (slug) do nothing;
