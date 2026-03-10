export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          checked_in_at: string
          checked_in_by: string
          created_at: string
          event_id: string
          id: string
          method: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_in_by: string
          created_at?: string
          event_id: string
          id?: string
          method?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string
          checked_in_by?: string
          created_at?: string
          event_id?: string
          id?: string
          method?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          accepted_at: string | null
          addressee_id: string
          created_at: string
          id: string
          muted: boolean
          requester_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          addressee_id: string
          created_at?: string
          id?: string
          muted?: boolean
          requester_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          addressee_id?: string
          created_at?: string
          id?: string
          muted?: boolean
          requester_id?: string
          status?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          event_id: string
          id: string
          is_active: boolean | null
          reveal_hidden_tickets: boolean | null
          ticket_limit_amount: number | null
          ticket_limit_type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          event_id: string
          id?: string
          is_active?: boolean | null
          reveal_hidden_tickets?: boolean | null
          ticket_limit_amount?: number | null
          ticket_limit_type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          event_id?: string
          id?: string
          is_active?: boolean | null
          reveal_hidden_tickets?: boolean | null
          ticket_limit_amount?: number | null
          ticket_limit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string
          id: string
          organiser_profile_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organiser_profile_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organiser_profile_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_threads_organiser_profile_id_fkey"
            columns: ["organiser_profile_id"]
            isOneToOne: false
            referencedRelation: "organiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_cohosts: {
        Row: {
          created_at: string
          event_id: string
          id: string
          organiser_profile_id: string
          role: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          organiser_profile_id: string
          role?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          organiser_profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_cohosts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cohosts_organiser_profile_id_fkey"
            columns: ["organiser_profile_id"]
            isOneToOne: false
            referencedRelation: "organiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_media: {
        Row: {
          created_at: string
          event_id: string
          id: string
          sort_order: number
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          sort_order?: number
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          sort_order?: number
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_messages: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_enabled: boolean | null
          reminder_type: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_enabled?: boolean | null
          reminder_type: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_enabled?: boolean | null
          reminder_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          end_date: string | null
          event_date: string
          guestlist_deadline: string | null
          guestlist_enabled: boolean | null
          guestlist_max_capacity: number | null
          guestlist_require_approval: boolean | null
          host_id: string
          id: string
          is_public: boolean | null
          location: string | null
          max_guests: number | null
          organiser_profile_id: string | null
          publish_at: string | null
          show_tickets_remaining: boolean | null
          sold_out_message: string | null
          status: string
          tags: Json | null
          ticket_price_cents: number
          tickets_available_from: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date: string
          guestlist_deadline?: string | null
          guestlist_enabled?: boolean | null
          guestlist_max_capacity?: number | null
          guestlist_require_approval?: boolean | null
          host_id: string
          id?: string
          is_public?: boolean | null
          location?: string | null
          max_guests?: number | null
          organiser_profile_id?: string | null
          publish_at?: string | null
          show_tickets_remaining?: boolean | null
          sold_out_message?: string | null
          status?: string
          tags?: Json | null
          ticket_price_cents?: number
          tickets_available_from?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          guestlist_deadline?: string | null
          guestlist_enabled?: boolean | null
          guestlist_max_capacity?: number | null
          guestlist_require_approval?: boolean | null
          host_id?: string
          id?: string
          is_public?: boolean | null
          location?: string | null
          max_guests?: number | null
          organiser_profile_id?: string | null
          publish_at?: string | null
          show_tickets_remaining?: boolean | null
          sold_out_message?: string | null
          status?: string
          tags?: Json | null
          ticket_price_cents?: number
          tickets_available_from?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "events_organiser_profile_id_fkey"
            columns: ["organiser_profile_id"]
            isOneToOne: false
            referencedRelation: "organiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_members: {
        Row: {
          group_chat_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_chat_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_chat_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_members_group_chat_id_fkey"
            columns: ["group_chat_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_messages: {
        Row: {
          content: string
          created_at: string
          group_chat_id: string
          id: string
          is_from_current_user: boolean
          sender_id: string | null
          sender_name: string
        }
        Insert: {
          content: string
          created_at?: string
          group_chat_id: string
          id?: string
          is_from_current_user?: boolean
          sender_id?: string | null
          sender_name: string
        }
        Update: {
          content?: string
          created_at?: string
          group_chat_id?: string
          id?: string
          is_from_current_user?: boolean
          sender_id?: string | null
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_messages_group_chat_id_fkey"
            columns: ["group_chat_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chats: {
        Row: {
          created_at: string
          id: string
          member_count: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_count?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_count?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          event_id: string
          id: string
          invitee_email: string
          invitee_id: string | null
          inviter_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invitee_email: string
          invitee_id?: string | null
          inviter_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invitee_email?: string
          invitee_id?: string | null
          inviter_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          event_reminders: boolean | null
          friend_activity: boolean | null
          id: string
          mentions: boolean | null
          messages: boolean | null
          new_events: boolean | null
          promotions: boolean | null
          push_notifications: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          event_reminders?: boolean | null
          friend_activity?: boolean | null
          id?: string
          mentions?: boolean | null
          messages?: boolean | null
          new_events?: boolean | null
          promotions?: boolean | null
          push_notifications?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          event_reminders?: boolean | null
          friend_activity?: boolean | null
          id?: string
          mentions?: boolean | null
          messages?: boolean | null
          new_events?: boolean | null
          promotions?: boolean | null
          push_notifications?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          avatar_url: string | null
          created_at: string
          event_image: string | null
          expires_at: string
          id: string
          link: string | null
          message: string
          organiser_profile_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          event_image?: string | null
          expires_at?: string
          id?: string
          link?: string | null
          message: string
          organiser_profile_id?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          event_image?: string | null
          expires_at?: string
          id?: string
          link?: string | null
          message?: string
          organiser_profile_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organiser_profile_id_fkey"
            columns: ["organiser_profile_id"]
            isOneToOne: false
            referencedRelation: "organiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          event_id: string
          expires_at: string
          id: string
          platform_fee_cents: number
          quantity: number
          reserved_at: string
          status: string
          stripe_account_id: string | null
          stripe_payment_intent_id: string | null
          ticket_tier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          event_id: string
          expires_at?: string
          id?: string
          platform_fee_cents?: number
          quantity?: number
          reserved_at?: string
          status?: string
          stripe_account_id?: string | null
          stripe_payment_intent_id?: string | null
          ticket_tier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          event_id?: string
          expires_at?: string
          id?: string
          platform_fee_cents?: number
          quantity?: number
          reserved_at?: string
          status?: string
          stripe_account_id?: string | null
          stripe_payment_intent_id?: string | null
          ticket_tier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_ticket_tier_id_fkey"
            columns: ["ticket_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      organiser_followers: {
        Row: {
          created_at: string
          id: string
          muted: boolean
          organiser_profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted?: boolean
          organiser_profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted?: boolean
          organiser_profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organiser_followers_organiser_profile_id_fkey"
            columns: ["organiser_profile_id"]
            isOneToOne: false
            referencedRelation: "organiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organiser_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string
          organiser_profile_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by: string
          organiser_profile_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string
          organiser_profile_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organiser_members_organiser_profile_id_fkey"
            columns: ["organiser_profile_id"]
            isOneToOne: false
            referencedRelation: "organiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organiser_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string
          city: string | null
          created_at: string
          display_name: string
          id: string
          instagram_handle: string | null
          opening_hours: Json | null
          owner_id: string
          tags: Json | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string
          city?: string | null
          created_at?: string
          display_name: string
          id?: string
          instagram_handle?: string | null
          opening_hours?: Json | null
          owner_id: string
          tags?: Json | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string
          city?: string | null
          created_at?: string
          display_name?: string
          id?: string
          instagram_handle?: string | null
          opening_hours?: Json | null
          owner_id?: string
          tags?: Json | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      organiser_stripe_accounts: {
        Row: {
          charges_enabled: boolean
          created_at: string
          id: string
          onboarding_complete: boolean
          organiser_profile_id: string
          payouts_enabled: boolean
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          charges_enabled?: boolean
          created_at?: string
          id?: string
          onboarding_complete?: boolean
          organiser_profile_id: string
          payouts_enabled?: boolean
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          charges_enabled?: boolean
          created_at?: string
          id?: string
          onboarding_complete?: boolean
          organiser_profile_id?: string
          payouts_enabled?: boolean
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organiser_stripe_accounts_organiser_profile_id_fkey"
            columns: ["organiser_profile_id"]
            isOneToOne: true
            referencedRelation: "organiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          order_id: string | null
          payload: Json | null
          stripe_event_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          stripe_event_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          points: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          points: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      post_collaborators: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_collaborators_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reposts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string | null
          created_at: string
          event_id: string | null
          gif_url: string | null
          id: string
          image_url: string | null
          organiser_profile_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string
          event_id?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          organiser_profile_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string
          event_id?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          organiser_profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_organiser_profile_id_fkey"
            columns: ["organiser_profile_id"]
            isOneToOne: false
            referencedRelation: "organiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_settings: {
        Row: {
          created_at: string
          go_public: boolean | null
          id: string
          share_going_events: boolean | null
          share_saved_events: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          go_public?: boolean | null
          id?: string
          share_going_events?: boolean | null
          share_saved_events?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          go_public?: boolean | null
          id?: string
          share_going_events?: boolean | null
          share_saved_events?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          email: string | null
          email_verified: boolean | null
          first_name: string | null
          id: string
          instagram_handle: string | null
          is_verified: boolean
          last_name: string | null
          page_classification: string | null
          phone: string | null
          profile_tier: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          id?: string
          instagram_handle?: string | null
          is_verified?: boolean
          last_name?: string | null
          page_classification?: string | null
          phone?: string | null
          profile_tier?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          id?: string
          instagram_handle?: string | null
          is_verified?: boolean
          last_name?: string | null
          page_classification?: string | null
          phone?: string | null
          profile_tier?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          endpoint: string
          id: string
          ip_address: string | null
          request_count: number
          user_id: string | null
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          ip_address?: string | null
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          ip_address?: string | null
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          initiated_by: string | null
          order_id: string
          reason: string | null
          status: string
          stripe_refund_id: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          id?: string
          initiated_by?: string | null
          order_id: string
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          initiated_by?: string | null
          order_id?: string
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          assigned_admin_id: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_post_id: string | null
          reported_user_id: string | null
          reporter_id: string
          resolution_notes: string | null
          status: string
          target_id: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          resolution_notes?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          resolution_notes?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_post_id_fkey"
            columns: ["reported_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          created_at: string
          event_id: string
          guest_count: number
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          guest_count?: number
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          guest_count?: number
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      saved_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          assigned_admin_id: string | null
          category: string
          context_metadata: Json | null
          created_at: string
          id: string
          message: string
          resolution_notes: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          category?: string
          context_metadata?: Json | null
          created_at?: string
          id?: string
          message: string
          resolution_notes?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          category?: string
          context_metadata?: Json | null
          created_at?: string
          id?: string
          message?: string
          resolution_notes?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ticket_tiers: {
        Row: {
          available_quantity: number | null
          created_at: string
          event_id: string
          id: string
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          available_quantity?: number | null
          created_at?: string
          event_id: string
          id?: string
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          available_quantity?: number | null
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          checked_in_at: string | null
          created_at: string
          event_id: string
          id: string
          order_id: string
          qr_code: string
          status: string
          ticket_tier_id: string | null
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          order_id: string
          qr_code: string
          status?: string
          ticket_tier_id?: string | null
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          order_id?: string
          qr_code?: string
          status?: string
          ticket_tier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_tier_id_fkey"
            columns: ["ticket_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_type: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_type: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_type?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_music_connections: {
        Row: {
          connected: boolean
          created_at: string
          id: string
          service_id: string
          user_id: string
        }
        Insert: {
          connected?: boolean
          created_at?: string
          id?: string
          service_id: string
          user_id: string
        }
        Update: {
          connected?: boolean
          created_at?: string
          id?: string
          service_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          created_at: string
          current_rank: Database["public"]["Enums"]["user_rank"]
          id: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_rank?: Database["public"]["Enums"]["user_rank"]
          id?: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_rank?: Database["public"]["Enums"]["user_rank"]
          id?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_vouchers: {
        Row: {
          code: string
          created_at: string
          earned_at_rank: Database["public"]["Enums"]["user_rank"]
          expires_at: string | null
          id: string
          status: string
          used_at: string | null
          user_id: string
          value_cents: number
        }
        Insert: {
          code: string
          created_at?: string
          earned_at_rank: Database["public"]["Enums"]["user_rank"]
          expires_at?: string | null
          id?: string
          status?: string
          used_at?: string | null
          user_id: string
          value_cents?: number
        }
        Update: {
          code?: string
          created_at?: string
          earned_at_rank?: Database["public"]["Enums"]["user_rank"]
          expires_at?: string | null
          id?: string
          status?: string
          used_at?: string | null
          user_id?: string
          value_cents?: number
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notified_at: string | null
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notified_at?: string | null
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notified_at?: string | null
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points: {
        Args: { p_action_type: string; p_description?: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_ip_address?: string
          p_max_requests?: number
          p_user_id?: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      get_friend_count: { Args: { p_user_id: string }; Returns: number }
      get_friends_and_following_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_group_chat_member_profiles: {
        Args: { p_group_chat_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      get_mutual_friends: {
        Args: { p_user_a: string; p_user_b: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      get_organiser_attendee_count: {
        Args: { p_organiser_profile_id: string }
        Returns: number
      }
      get_organiser_follower_count: {
        Args: { p_organiser_profile_id: string }
        Returns: number
      }
      get_organiser_past_event_count: {
        Args: { p_organiser_profile_id: string }
        Returns: number
      }
      get_personal_combined_event_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_group_chat_member: {
        Args: { p_group_chat_id: string; p_user_id: string }
        Returns: boolean
      }
      is_organiser_member: {
        Args: { p_organiser_profile_id: string; p_user_id: string }
        Returns: boolean
      }
      is_organiser_owner: {
        Args: { p_organiser_profile_id: string; p_user_id: string }
        Returns: boolean
      }
      is_profile_public: { Args: { p_user_id: string }; Returns: boolean }
      purge_expired_notifications: { Args: never; Returns: undefined }
      rsvp_join:
        | { Args: { p_event_id: string; p_status?: string }; Returns: Json }
        | {
            Args: {
              p_event_id: string
              p_guest_count?: number
              p_status?: string
            }
            Returns: Json
          }
      rsvp_leave: { Args: { p_event_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "super_admin" | "moderator" | "support"
      user_rank: "bronze" | "silver" | "gold" | "platinum" | "diamond"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "moderator", "support"],
      user_rank: ["bronze", "silver", "gold", "platinum", "diamond"],
    },
  },
} as const
