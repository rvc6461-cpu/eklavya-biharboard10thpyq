
GRANT SELECT ON public.subjects, public.sub_subjects, public.chapters, public.questions,
  public.mock_test_templates, public.mock_test_questions, public.notes, public.notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects, public.sub_subjects, public.chapters, public.questions,
  public.mock_test_templates, public.mock_test_questions, public.notes, public.notifications TO authenticated;
GRANT ALL ON public.subjects, public.sub_subjects, public.chapters, public.questions,
  public.mock_test_templates, public.mock_test_questions, public.notes, public.notifications TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempts, public.bookmarks, public.mistakes,
  public.mock_tests, public.practice_sessions, public.profiles TO authenticated;
GRANT ALL ON public.attempts, public.bookmarks, public.mistakes,
  public.mock_tests, public.practice_sessions, public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
