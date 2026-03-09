

## Plan: Fix Group Chat — Add Members on Creation

### Problem
The `CreateGroupChatModal` only has a name field. There's no way to search/select friends to add to the group chat. The backend tables (`group_chats`, `group_chat_members`) and RLS policies are already set up correctly — the issue is purely a missing UI flow.

### Changes

**1. Enhance `CreateGroupChatModal` — add friend picker**
- After entering a group name, show a searchable list of the user's accepted friends (from `connections` table + `profiles`)
- Allow toggling friends on/off with checkboxes
- On "Create Group", insert the group chat, then batch-insert `group_chat_members` rows for the creator + all selected friends
- Update `member_count` to reflect actual count (creator + selected)

**2. Update `group_chats` RLS — allow creator to update member_count**
- Currently `group_chats` has no UPDATE policy. Add one so the creator (or members) can update `member_count` when members are added.
- Alternatively, skip tracking `member_count` manually and compute it from `group_chat_members` count — simpler and more reliable.

**3. Fix `group_chat_members` RLS for adding others**
- The current INSERT policy allows: `auth.uid() = user_id` OR user is already a member of the group. This means the creator can add themselves, then add others since they're a member. This should work as-is, but the current code inserts the creator first, so subsequent inserts for other members should pass RLS. We'll batch the creator insert first, then insert the rest.

### Implementation Details

- Query friends: `SELECT` from `connections` where `status = 'accepted'`, then fetch matching `profiles` for display names/avatars
- UI: Scrollable checklist below the name input, with a search/filter field
- On create: insert group → insert creator as member → insert selected friends as members → update `member_count`
- Add a DB migration to allow members to UPDATE `group_chats` (for `member_count`) or compute count dynamically

### Files Modified
- `src/components/CreateGroupChatModal.tsx` — major rewrite with friend picker UI
- Migration SQL — add UPDATE policy on `group_chats` for members

