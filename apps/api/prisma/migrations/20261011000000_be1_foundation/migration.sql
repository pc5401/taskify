-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "InviteRole" AS ENUM ('EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INVITED', 'ASSIGNED', 'MENTIONED', 'DUE_SOON', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CARD_CREATED', 'CARD_MOVED', 'ASSIGNEE_CHANGED', 'DUE_CHANGED', 'DEPENDENCY_SET', 'DEPENDENCY_CLEARED', 'CHECKLIST_CHANGED', 'CARD_UPDATED', 'CARD_DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#5534DA',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_members" (
    "board_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_members_pkey" PRIMARY KEY ("board_id","user_id")
);

-- CreateTable
CREATE TABLE "columns" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "wip_limit" INTEGER,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "column_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "creator_id" UUID NOT NULL,
    "assignee_id" UUID,
    "predecessor_id" UUID,
    "due_at" TIMESTAMPTZ(3),
    "position" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_tags" (
    "card_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "board_id" UUID NOT NULL,

    CONSTRAINT "card_tags_pkey" PRIMARY KEY ("card_id","tag_id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "invitee_email" TEXT NOT NULL,
    "requested_role" "InviteRole" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" "ActivityAction" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "due_at_snapshot" TIMESTAMPTZ(3),
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "columns_board_id_position_idx" ON "columns"("board_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "columns_id_board_id_key" ON "columns"("id", "board_id");

-- CreateIndex
CREATE INDEX "cards_column_id_position_idx" ON "cards"("column_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "cards_id_board_id_key" ON "cards"("id", "board_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_id_board_id_key" ON "tags"("id", "board_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "columns" ADD CONSTRAINT "columns_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_column_board_fk" FOREIGN KEY ("column_id", "board_id") REFERENCES "columns"("id", "board_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_assignee_board_fk" FOREIGN KEY ("board_id", "assignee_id") REFERENCES "board_members"("board_id", "user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_predecessor_board_fk" FOREIGN KEY ("predecessor_id", "board_id") REFERENCES "cards"("id", "board_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_card_board_fk" FOREIGN KEY ("card_id", "board_id") REFERENCES "cards"("id", "board_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_tag_board_fk" FOREIGN KEY ("tag_id", "board_id") REFERENCES "tags"("id", "board_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Prisma cannot describe expression/partial indexes, CHECKs or constraint triggers.
CREATE UNIQUE INDEX tags_board_lower_name_key ON tags (board_id, lower(name));
CREATE UNIQUE INDEX invitations_pending_email_key
  ON invitations (board_id, invitee_email) WHERE status = 'PENDING';
CREATE UNIQUE INDEX notifications_due_snapshot_key
  ON notifications (user_id, type, resource_id, due_at_snapshot)
  WHERE type IN ('DUE_SOON', 'OVERDUE');

ALTER TABLE cards ADD CONSTRAINT cards_not_self_predecessor
  CHECK (predecessor_id <> id);
ALTER TABLE columns ADD CONSTRAINT columns_positive_wip
  CHECK (wip_limit IS NULL OR wip_limit >= 1);
ALTER TABLE notifications ADD CONSTRAINT notifications_due_snapshot_required
  CHECK (type NOT IN ('DUE_SOON', 'OVERDUE') OR due_at_snapshot IS NOT NULL);

-- Trigger both board INSERT and membership changes: a newly created board without
-- any membership must also fail. Deleted boards are exempt (cascade deletion).
CREATE FUNCTION enforce_board_owner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  affected UUID;
  board_ids UUID[];
BEGIN
  IF TG_TABLE_NAME = 'boards' THEN
    board_ids := ARRAY[NEW.id];
  ELSIF TG_OP = 'DELETE' THEN
    board_ids := ARRAY[OLD.board_id];
  ELSIF TG_OP = 'INSERT' THEN
    board_ids := ARRAY[NEW.board_id];
  ELSE
    board_ids := ARRAY[OLD.board_id, NEW.board_id];
  END IF;
  FOR affected IN SELECT DISTINCT unnest(board_ids) ORDER BY 1 LOOP
    -- Serialize owner checks, including callers that bypass the application.
    PERFORM id FROM boards WHERE id = affected FOR UPDATE;
    IF FOUND AND NOT EXISTS (
      SELECT 1 FROM board_members WHERE board_id = affected AND role = 'OWNER'
    ) THEN
      RAISE EXCEPTION 'LAST_OWNER'
        USING ERRCODE = '23514', CONSTRAINT = 'boards_require_owner';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER boards_require_owner
  AFTER INSERT ON boards DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_board_owner();
CREATE CONSTRAINT TRIGGER boards_require_owner
  AFTER INSERT OR UPDATE OR DELETE ON board_members DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_board_owner();

