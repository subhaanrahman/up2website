-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  push_notifications boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  event_reminders boolean DEFAULT true,
  friend_activity boolean DEFAULT true,
  new_events boolean DEFAULT false,
  promotions boolean DEFAULT false,
  messages boolean DEFAULT true,
  mentions boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create privacy_settings table
CREATE TABLE public.privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  go_public boolean DEFAULT true,
  share_saved_events boolean DEFAULT false,
  share_going_events boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_settings
CREATE POLICY "Users can view own notification settings"
ON public.notification_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
ON public.notification_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
ON public.notification_settings FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for privacy_settings
CREATE POLICY "Users can view own privacy settings"
ON public.privacy_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
ON public.privacy_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
ON public.privacy_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at
BEFORE UPDATE ON public.privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.privacy_settings;