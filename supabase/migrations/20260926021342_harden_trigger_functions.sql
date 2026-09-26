-- Trigger functions run as SECURITY DEFINER so they can write rows the caller
-- can't (people rows for members, activity events). They are only ever fired
-- by triggers, so nobody needs to call them through the API.
revoke all on function
  public.handle_auth_user_change(),
  public.sync_member_person(),
  public.sync_profile_people(),
  public.log_project_activity(),
  public.log_milestone_activity(),
  public.log_task_activity()
from public, anon, authenticated;
