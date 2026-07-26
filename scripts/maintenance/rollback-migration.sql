-- ═══════════════════════════════════════════════════════════
-- Rollback: 20260331000001_indexes_and_rls.sql
-- Run this in Supabase SQL Editor to undo the migration above.
-- ═══════════════════════════════════════════════════════════

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS idx_profiles_specialty;
DROP INDEX IF EXISTS idx_profiles_availability;
DROP INDEX IF EXISTS idx_posts_author_id;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_posts_tag;
DROP INDEX IF EXISTS idx_post_likes_user_id;
DROP INDEX IF EXISTS idx_post_likes_post_id;
DROP INDEX IF EXISTS idx_post_comments_post_id;
DROP INDEX IF EXISTS idx_post_comments_author;
DROP INDEX IF EXISTS idx_notifications_user_read_time;
DROP INDEX IF EXISTS idx_messages_convo_time;
DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_conversations_user1;
DROP INDEX IF EXISTS idx_conversations_user2;
DROP INDEX IF EXISTS idx_conversations_last;
DROP INDEX IF EXISTS idx_job_postings_company;
DROP INDEX IF EXISTS idx_job_postings_active;
DROP INDEX IF EXISTS idx_job_postings_specialty;
DROP INDEX IF EXISTS idx_job_applications_job;
DROP INDEX IF EXISTS idx_job_applications_applicant;
DROP INDEX IF EXISTS idx_portfolio_user;
DROP INDEX IF EXISTS idx_xp_events_user;
DROP INDEX IF EXISTS idx_xp_events_type;
DROP INDEX IF EXISTS idx_user_badges_user;

-- Restore original permissive policies (re-run supabase/schema.sql to restore)
-- WARNING: This will remove all data protection added above.
-- After running this, re-apply supabase/schema.sql from the repo root.
