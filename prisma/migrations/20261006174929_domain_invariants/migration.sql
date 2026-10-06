ALTER TABLE lists
  ADD CONSTRAINT lists_name_not_blank CHECK (length(trim(name)) > 0);

ALTER TABLE list_items
  ADD CONSTRAINT list_items_title_not_blank CHECK (length(trim(title)) > 0);

CREATE UNIQUE INDEX list_invites_invite_code_upper_key
  ON list_invites (upper(invite_code))
  WHERE invite_code IS NOT NULL;

CREATE UNIQUE INDEX list_invites_one_active_per_list_key
  ON list_invites (list_id)
  WHERE is_active;

CREATE OR REPLACE FUNCTION enforce_list_member_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.list_id::text, 0));
  IF (SELECT count(*) FROM list_members WHERE list_id = NEW.list_id) >= 5 THEN
    RAISE EXCEPTION 'MEMBER_LIMIT_REACHED' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER list_members_enforce_limit
  BEFORE INSERT ON list_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_list_member_limit();