-- Optimise group chat list loading
-- Single RPC to fetch a user's group chats with last message + member previews

create or replace function public.get_user_group_chats(p_user_id uuid)
returns table (
  id uuid,
  name text,
  member_count integer,
  last_message text,
  last_message_created_at timestamptz,
  member_previews jsonb
)
language sql
stable
security definer
set search_path to public
as $$
  with user_chats as (
    select gc.id,
           gc.name,
           gc.member_count
    from group_chats gc
    join group_chat_members gm
      on gm.group_chat_id = gc.id
    where gm.user_id = p_user_id
  ),
  last_messages as (
    select distinct on (m.group_chat_id)
           m.group_chat_id,
           m.sender_name,
           m.content,
           m.created_at
    from group_chat_messages m
    join user_chats uc
      on uc.id = m.group_chat_id
    order by m.group_chat_id, m.created_at desc
  ),
  previews as (
    select
      gm.group_chat_id,
      jsonb_agg(
        jsonb_build_object(
          'user_id', p.user_id,
          'display_name', p.display_name,
          'avatar_url', p.avatar_url
        )
        order by p.display_name nulls last
      ) filter (where p.user_id is not null) as members
    from group_chat_members gm
    join profiles p on p.user_id = gm.user_id
    join user_chats uc on uc.id = gm.group_chat_id
    group by gm.group_chat_id
  )
  select
    uc.id,
    uc.name,
    uc.member_count,
    case
      when lm.sender_name is not null then lm.sender_name || ': ' || lm.content
      else null
    end as last_message,
    lm.created_at as last_message_created_at,
    coalesce(p.members, '[]'::jsonb) as member_previews
  from user_chats uc
  left join last_messages lm on lm.group_chat_id = uc.id
  left join previews p on p.group_chat_id = uc.id
  order by coalesce(lm.created_at, now()) desc;
$$;

