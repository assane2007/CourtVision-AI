-- ============================================================
-- Migration: Enable RLS + Auth Gating + Role-Based Policies
-- Timestamp: 20260713021236
-- ============================================================

-- ── Helper function: check if current user is admin ──────────────────────────
-- Uses auth.users app_metadata to avoid circular dependency on Player table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Player"
    WHERE id = auth.uid()::text
    AND role = 'admin'
    AND "accountDeleted" = false
  )
$$;

-- ── Helper function: check if player account is active ───────────────────────
CREATE OR REPLACE FUNCTION public.is_active_player()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Player"
    WHERE id = auth.uid()::text
    AND "accountDeleted" = false
  )
$$;

-- ============================================================
-- 1. PLAYER TABLE (core user table — special pattern)
-- ============================================================
ALTER TABLE public."Player" ENABLE ROW LEVEL SECURITY;

-- Players can read their own profile
DROP POLICY IF EXISTS "player_select_own" ON public."Player";
CREATE POLICY "player_select_own"
ON public."Player" FOR SELECT
TO authenticated
USING (id = auth.uid()::text);

-- Players can read other public profiles (for social features)
DROP POLICY IF EXISTS "player_select_public" ON public."Player";
CREATE POLICY "player_select_public"
ON public."Player" FOR SELECT
TO authenticated
USING ("profilePublic" = true AND "accountDeleted" = false);

-- Players can update their own profile
DROP POLICY IF EXISTS "player_update_own" ON public."Player";
CREATE POLICY "player_update_own"
ON public."Player" FOR UPDATE
TO authenticated
USING (id = auth.uid()::text)
WITH CHECK (id = auth.uid()::text);

-- Players can insert their own record (sync from Supabase auth)
DROP POLICY IF EXISTS "player_insert_own" ON public."Player";
CREATE POLICY "player_insert_own"
ON public."Player" FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid()::text);

-- Admins have full access to all players
DROP POLICY IF EXISTS "admin_full_access_player" ON public."Player";
CREATE POLICY "admin_full_access_player"
ON public."Player" FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- 2. WORKOUT SESSION
-- ============================================================
ALTER TABLE public."WorkoutSession" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_workout_session" ON public."WorkoutSession";
CREATE POLICY "player_manage_own_workout_session"
ON public."WorkoutSession" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "admin_full_access_workout_session" ON public."WorkoutSession";
CREATE POLICY "admin_full_access_workout_session"
ON public."WorkoutSession" FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- 3. WORKOUT SESSION DRILL
-- ============================================================
ALTER TABLE public."WorkoutSessionDrill" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_workout_session_drill" ON public."WorkoutSessionDrill";
CREATE POLICY "player_manage_own_workout_session_drill"
ON public."WorkoutSessionDrill" FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."WorkoutSession" ws
    WHERE ws.id = "sessionId"
    AND ws."playerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."WorkoutSession" ws
    WHERE ws.id = "sessionId"
    AND ws."playerId" = auth.uid()::text
  )
);

-- ============================================================
-- 4. DRILL FAVORITE
-- ============================================================
ALTER TABLE public."DrillFavorite" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_drill_favorite" ON public."DrillFavorite";
CREATE POLICY "player_manage_own_drill_favorite"
ON public."DrillFavorite" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 5. TRAINING PLAN
-- ============================================================
ALTER TABLE public."TrainingPlan" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_training_plan" ON public."TrainingPlan";
CREATE POLICY "player_manage_own_training_plan"
ON public."TrainingPlan" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "player_read_public_training_plan" ON public."TrainingPlan";
CREATE POLICY "player_read_public_training_plan"
ON public."TrainingPlan" FOR SELECT
TO authenticated
USING ("isPublic" = true);

-- ============================================================
-- 6. TRAINING PLAN DRILL
-- ============================================================
ALTER TABLE public."TrainingPlanDrill" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_training_plan_drill" ON public."TrainingPlanDrill";
CREATE POLICY "player_manage_own_training_plan_drill"
ON public."TrainingPlanDrill" FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."TrainingPlan" tp
    WHERE tp.id = "planId"
    AND tp."playerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."TrainingPlan" tp
    WHERE tp.id = "planId"
    AND tp."playerId" = auth.uid()::text
  )
);

-- ============================================================
-- 7. ACHIEVEMENT
-- ============================================================
ALTER TABLE public."Achievement" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_own_achievement" ON public."Achievement";
CREATE POLICY "player_read_own_achievement"
ON public."Achievement" FOR SELECT
TO authenticated
USING ("playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "player_insert_own_achievement" ON public."Achievement";
CREATE POLICY "player_insert_own_achievement"
ON public."Achievement" FOR INSERT
TO authenticated
WITH CHECK ("playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "admin_full_access_achievement" ON public."Achievement";
CREATE POLICY "admin_full_access_achievement"
ON public."Achievement" FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- 8. REACTION SCORE
-- ============================================================
ALTER TABLE public."ReactionScore" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_reaction_score" ON public."ReactionScore";
CREATE POLICY "player_manage_own_reaction_score"
ON public."ReactionScore" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 9. AI CHAT MESSAGE
-- ============================================================
ALTER TABLE public."AIChatMessage" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_ai_chat_message" ON public."AIChatMessage";
CREATE POLICY "player_manage_own_ai_chat_message"
ON public."AIChatMessage" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 10. XP LOG
-- ============================================================
ALTER TABLE public."XpLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_own_xp_log" ON public."XpLog";
CREATE POLICY "player_read_own_xp_log"
ON public."XpLog" FOR SELECT
TO authenticated
USING ("playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "player_insert_own_xp_log" ON public."XpLog";
CREATE POLICY "player_insert_own_xp_log"
ON public."XpLog" FOR INSERT
TO authenticated
WITH CHECK ("playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "admin_full_access_xp_log" ON public."XpLog";
CREATE POLICY "admin_full_access_xp_log"
ON public."XpLog" FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- 11. FRIENDSHIP
-- ============================================================
ALTER TABLE public."Friendship" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_friendship" ON public."Friendship";
CREATE POLICY "player_manage_own_friendship"
ON public."Friendship" FOR ALL
TO authenticated
USING (
  "requesterId" = auth.uid()::text OR
  "recipientId" = auth.uid()::text
)
WITH CHECK (
  "requesterId" = auth.uid()::text OR
  "recipientId" = auth.uid()::text
);

-- ============================================================
-- 12. TEAM
-- ============================================================
ALTER TABLE public."Team" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_public_team" ON public."Team";
CREATE POLICY "player_read_public_team"
ON public."Team" FOR SELECT
TO authenticated
USING ("isPublic" = true);

DROP POLICY IF EXISTS "player_manage_own_team" ON public."Team";
CREATE POLICY "player_manage_own_team"
ON public."Team" FOR ALL
TO authenticated
USING ("ownerId" = auth.uid()::text)
WITH CHECK ("ownerId" = auth.uid()::text);

-- ============================================================
-- 13. TEAM MEMBER
-- ============================================================
ALTER TABLE public."TeamMember" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_team_member" ON public."TeamMember";
CREATE POLICY "player_read_team_member"
ON public."TeamMember" FOR SELECT
TO authenticated
USING (
  "playerId" = auth.uid()::text OR
  EXISTS (
    SELECT 1 FROM public."TeamMember" tm2
    WHERE tm2."teamId" = "teamId"
    AND tm2."playerId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "player_manage_own_team_member" ON public."TeamMember";
CREATE POLICY "player_manage_own_team_member"
ON public."TeamMember" FOR INSERT
TO authenticated
WITH CHECK ("playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "player_delete_own_team_member" ON public."TeamMember";
CREATE POLICY "player_delete_own_team_member"
ON public."TeamMember" FOR DELETE
TO authenticated
USING ("playerId" = auth.uid()::text);

-- ============================================================
-- 14. CHALLENGE
-- ============================================================
ALTER TABLE public."Challenge" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_public_challenge" ON public."Challenge";
CREATE POLICY "player_read_public_challenge"
ON public."Challenge" FOR SELECT
TO authenticated
USING ("isPublic" = true);

DROP POLICY IF EXISTS "player_manage_own_challenge" ON public."Challenge";
CREATE POLICY "player_manage_own_challenge"
ON public."Challenge" FOR ALL
TO authenticated
USING ("creatorId" = auth.uid()::text)
WITH CHECK ("creatorId" = auth.uid()::text);

-- ============================================================
-- 15. CHALLENGE PARTICIPANT
-- ============================================================
ALTER TABLE public."ChallengeParticipant" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_challenge_participant" ON public."ChallengeParticipant";
CREATE POLICY "player_manage_own_challenge_participant"
ON public."ChallengeParticipant" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "player_read_challenge_participants" ON public."ChallengeParticipant";
CREATE POLICY "player_read_challenge_participants"
ON public."ChallengeParticipant" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."Challenge" c
    WHERE c.id = "challengeId"
    AND c."isPublic" = true
  )
);

-- ============================================================
-- 16. TEAM CHALLENGE
-- ============================================================
ALTER TABLE public."TeamChallenge" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_team_challenge" ON public."TeamChallenge";
CREATE POLICY "player_read_team_challenge"
ON public."TeamChallenge" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."TeamMember" tm
    WHERE tm."teamId" = "teamId"
    AND tm."playerId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "player_manage_team_challenge" ON public."TeamChallenge";
CREATE POLICY "player_manage_team_challenge"
ON public."TeamChallenge" FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."Team" t
    WHERE t.id = "teamId"
    AND t."ownerId" = auth.uid()::text
  )
);

-- ============================================================
-- 17. FEED POST
-- ============================================================
ALTER TABLE public."FeedPost" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_feed_post" ON public."FeedPost";
CREATE POLICY "player_read_feed_post"
ON public."FeedPost" FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "player_manage_own_feed_post" ON public."FeedPost";
CREATE POLICY "player_manage_own_feed_post"
ON public."FeedPost" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 18. FEED POST LIKE
-- ============================================================
ALTER TABLE public."FeedPostLike" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_feed_post_like" ON public."FeedPostLike";
CREATE POLICY "player_manage_own_feed_post_like"
ON public."FeedPostLike" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "player_read_feed_post_like" ON public."FeedPostLike";
CREATE POLICY "player_read_feed_post_like"
ON public."FeedPostLike" FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 19. COMMENT
-- ============================================================
ALTER TABLE public."Comment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_comment" ON public."Comment";
CREATE POLICY "player_read_comment"
ON public."Comment" FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "player_manage_own_comment" ON public."Comment";
CREATE POLICY "player_manage_own_comment"
ON public."Comment" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 20. COMMENT REPLY
-- ============================================================
ALTER TABLE public."CommentReply" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_comment_reply" ON public."CommentReply";
CREATE POLICY "player_read_comment_reply"
ON public."CommentReply" FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "player_manage_own_comment_reply" ON public."CommentReply";
CREATE POLICY "player_manage_own_comment_reply"
ON public."CommentReply" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 21. CONVERSATION
-- ============================================================
ALTER TABLE public."Conversation" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_own_conversation" ON public."Conversation";
CREATE POLICY "player_read_own_conversation"
ON public."Conversation" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."ConversationMember" cm
    WHERE cm."conversationId" = id
    AND cm."playerId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "player_create_conversation" ON public."Conversation";
CREATE POLICY "player_create_conversation"
ON public."Conversation" FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- 22. CONVERSATION MEMBER
-- ============================================================
ALTER TABLE public."ConversationMember" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_conversation_member" ON public."ConversationMember";
CREATE POLICY "player_manage_own_conversation_member"
ON public."ConversationMember" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "player_read_conversation_member" ON public."ConversationMember";
CREATE POLICY "player_read_conversation_member"
ON public."ConversationMember" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."ConversationMember" cm2
    WHERE cm2."conversationId" = "conversationId"
    AND cm2."playerId" = auth.uid()::text
  )
);

-- ============================================================
-- 23. MESSAGE
-- ============================================================
ALTER TABLE public."Message" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_own_message" ON public."Message";
CREATE POLICY "player_read_own_message"
ON public."Message" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."ConversationMember" cm
    WHERE cm."conversationId" = "conversationId"
    AND cm."playerId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "player_send_message" ON public."Message";
CREATE POLICY "player_send_message"
ON public."Message" FOR INSERT
TO authenticated
WITH CHECK (
  "senderId" = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM public."ConversationMember" cm
    WHERE cm."conversationId" = "conversationId"
    AND cm."playerId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "player_update_own_message" ON public."Message";
CREATE POLICY "player_update_own_message"
ON public."Message" FOR UPDATE
TO authenticated
USING ("senderId" = auth.uid()::text)
WITH CHECK ("senderId" = auth.uid()::text);

-- ============================================================
-- 24. FOLLOW
-- ============================================================
ALTER TABLE public."Follow" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_follow" ON public."Follow";
CREATE POLICY "player_manage_own_follow"
ON public."Follow" FOR ALL
TO authenticated
USING ("followerId" = auth.uid()::text)
WITH CHECK ("followerId" = auth.uid()::text);

DROP POLICY IF EXISTS "player_read_follow" ON public."Follow";
CREATE POLICY "player_read_follow"
ON public."Follow" FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 25. LIVE SESSION
-- ============================================================
ALTER TABLE public."LiveSession" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_live_session" ON public."LiveSession";
CREATE POLICY "player_read_live_session"
ON public."LiveSession" FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "player_manage_own_live_session" ON public."LiveSession";
CREATE POLICY "player_manage_own_live_session"
ON public."LiveSession" FOR ALL
TO authenticated
USING ("hostId" = auth.uid()::text)
WITH CHECK ("hostId" = auth.uid()::text);

-- ============================================================
-- 26. LIVE PARTICIPANT
-- ============================================================
ALTER TABLE public."LiveParticipant" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_live_participant" ON public."LiveParticipant";
CREATE POLICY "player_manage_own_live_participant"
ON public."LiveParticipant" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "player_read_live_participant" ON public."LiveParticipant";
CREATE POLICY "player_read_live_participant"
ON public."LiveParticipant" FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 27. NOTIFICATION
-- ============================================================
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_notification" ON public."Notification";
CREATE POLICY "player_manage_own_notification"
ON public."Notification" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 28. VIDEO
-- ============================================================
ALTER TABLE public."Video" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_public_video" ON public."Video";
CREATE POLICY "player_read_public_video"
ON public."Video" FOR SELECT
TO authenticated
USING ("isPublic" = true OR "playerId" = auth.uid()::text);

DROP POLICY IF EXISTS "player_manage_own_video" ON public."Video";
CREATE POLICY "player_manage_own_video"
ON public."Video" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 29. VIDEO ANNOTATION
-- ============================================================
ALTER TABLE public."VideoAnnotation" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_video_annotation" ON public."VideoAnnotation";
CREATE POLICY "player_manage_own_video_annotation"
ON public."VideoAnnotation" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 30. VIDEO HIGHLIGHT
-- ============================================================
ALTER TABLE public."VideoHighlight" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_video_highlight" ON public."VideoHighlight";
CREATE POLICY "player_read_video_highlight"
ON public."VideoHighlight" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."Video" v
    WHERE v.id = "videoId"
    AND (v."isPublic" = true OR v."playerId" = auth.uid()::text)
  )
);

DROP POLICY IF EXISTS "player_manage_own_video_highlight" ON public."VideoHighlight";
CREATE POLICY "player_manage_own_video_highlight"
ON public."VideoHighlight" FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."Video" v
    WHERE v.id = "videoId"
    AND v."playerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."Video" v
    WHERE v.id = "videoId"
    AND v."playerId" = auth.uid()::text
  )
);

-- ============================================================
-- 31. VIDEO EXPORT
-- ============================================================
ALTER TABLE public."VideoExport" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_video_export" ON public."VideoExport";
CREATE POLICY "player_manage_own_video_export"
ON public."VideoExport" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 32. SESSION COMMENT
-- ============================================================
ALTER TABLE public."SessionComment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_read_session_comment" ON public."SessionComment";
CREATE POLICY "player_read_session_comment"
ON public."SessionComment" FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "player_manage_own_session_comment" ON public."SessionComment";
CREATE POLICY "player_manage_own_session_comment"
ON public."SessionComment" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 33. POSE DATA
-- ============================================================
ALTER TABLE public."PoseData" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_pose_data" ON public."PoseData";
CREATE POLICY "player_manage_own_pose_data"
ON public."PoseData" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 34. SHOT DETECTION
-- ============================================================
ALTER TABLE public."ShotDetection" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_shot_detection" ON public."ShotDetection";
CREATE POLICY "player_manage_own_shot_detection"
ON public."ShotDetection" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 35. FORM ANALYSIS
-- ============================================================
ALTER TABLE public."FormAnalysis" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_form_analysis" ON public."FormAnalysis";
CREATE POLICY "player_manage_own_form_analysis"
ON public."FormAnalysis" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 36. PLAYER INSIGHT
-- ============================================================
ALTER TABLE public."PlayerInsight" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_player_insight" ON public."PlayerInsight";
CREATE POLICY "player_manage_own_player_insight"
ON public."PlayerInsight" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 37. PLAYER DOCUMENT
-- ============================================================
ALTER TABLE public."PlayerDocument" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_player_document" ON public."PlayerDocument";
CREATE POLICY "player_manage_own_player_document"
ON public."PlayerDocument" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 38. VOICE SESSION
-- ============================================================
ALTER TABLE public."VoiceSession" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_voice_session" ON public."VoiceSession";
CREATE POLICY "player_manage_own_voice_session"
ON public."VoiceSession" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 39. PREDICTION
-- ============================================================
ALTER TABLE public."Prediction" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_prediction" ON public."Prediction";
CREATE POLICY "player_manage_own_prediction"
ON public."Prediction" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 40. GENERATED WORKOUT
-- ============================================================
ALTER TABLE public."GeneratedWorkout" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_generated_workout" ON public."GeneratedWorkout";
CREATE POLICY "player_manage_own_generated_workout"
ON public."GeneratedWorkout" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 41. EMAIL VERIFICATION TOKEN
-- ============================================================
ALTER TABLE public."EmailVerificationToken" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_email_verification_token" ON public."EmailVerificationToken";
CREATE POLICY "player_manage_own_email_verification_token"
ON public."EmailVerificationToken" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 42. TWO FACTOR BACKUP CODE
-- ============================================================
ALTER TABLE public."TwoFactorBackupCode" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_two_factor_backup_code" ON public."TwoFactorBackupCode";
CREATE POLICY "player_manage_own_two_factor_backup_code"
ON public."TwoFactorBackupCode" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 43. DEVICE
-- ============================================================
ALTER TABLE public."Device" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_device" ON public."Device";
CREATE POLICY "player_manage_own_device"
ON public."Device" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 44. DAILY LOGIN
-- ============================================================
ALTER TABLE public."DailyLogin" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_daily_login" ON public."DailyLogin";
CREATE POLICY "player_manage_own_daily_login"
ON public."DailyLogin" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 45. OFFLINE ACTION
-- ============================================================
ALTER TABLE public."OfflineAction" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_offline_action" ON public."OfflineAction";
CREATE POLICY "player_manage_own_offline_action"
ON public."OfflineAction" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- 46. REFRESH TOKEN
-- ============================================================
ALTER TABLE public."RefreshToken" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_manage_own_refresh_token" ON public."RefreshToken";
CREATE POLICY "player_manage_own_refresh_token"
ON public."RefreshToken" FOR ALL
TO authenticated
USING ("playerId" = auth.uid()::text)
WITH CHECK ("playerId" = auth.uid()::text);

-- ============================================================
-- DRILL TABLE (already has RLS enabled — add admin policy)
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_drill" ON public."Drill";
CREATE POLICY "admin_full_access_drill"
ON public."Drill" FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
