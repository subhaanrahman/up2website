CREATE OR REPLACE FUNCTION public.get_personal_combined_event_count(p_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(DISTINCT r.event_id)::integer
  FROM rsvps r
  JOIN events e ON e.id = r.event_id
  WHERE r.user_id = p_user_id
    AND r.status = 'going'
    AND e.event_date < now();
$function$