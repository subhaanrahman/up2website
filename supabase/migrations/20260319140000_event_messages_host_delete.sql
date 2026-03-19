-- Allow event hosts to delete messages in their event's chat (e.g. moderation)
CREATE POLICY "Hosts can delete messages in their event"
  ON public.event_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_messages.event_id
        AND events.host_id = auth.uid()
    )
  );
