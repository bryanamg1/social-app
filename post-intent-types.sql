ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS post_type VARCHAR(40) NOT NULL DEFAULT 'personal_update' AFTER image_url;

UPDATE posts
SET post_type = 'personal_update'
WHERE post_type IS NULL
   OR TRIM(post_type) = ''
   OR post_type NOT IN (
     'personal_update',
     'project',
     'question',
     'learning',
     'help',
     'collaboration',
     'launch'
   );
