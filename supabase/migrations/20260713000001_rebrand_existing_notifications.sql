-- TalentHub – replace the former brand name in existing generated notifications.
-- This targets only app-generated notification copy and does not touch user content.

UPDATE public.notifications
SET
  title = replace(replace(replace(title, 'ClassLink', 'TalentHub'), 'Classlink', 'TalentHub'), 'classlink', 'talenthub'),
  body  = replace(replace(replace(body,  'ClassLink', 'TalentHub'), 'Classlink', 'TalentHub'), 'classlink', 'talenthub')
WHERE
  title ILIKE '%classlink%'
  OR body ILIKE '%classlink%';
