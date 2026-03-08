# Gamification Options & Roadmap

## Currently Implemented

### Points & Ranks
- **5 ranks**: Bronze → Silver → Gold → Platinum → Diamond
- **Thresholds**: 0 / 1,000 / 2,000 / 3,000 / 4,000 points
- **Point actions**: Add friend (5), Save event (5), Like post (5), Follow organiser (10), Share event (10), RSVP (25), Buy ticket (50), Create event (50), App review (50)
- **Rank-up vouchers**: $5 reward voucher auto-issued on each rank promotion
- **Realtime sync**: Points & rank update live via Supabase realtime subscription

### Notifications (Gamification-Related)
- Friend rank-up alerts: "Your friend just moved into Silver — catch up?"
- Processed hourly via `notifications-process` cron

### Post Reactions
- 5 reaction types: ❤️ Heart, 🔥 Fire/Lit, 👀 Watch Out, 🙏 Yessir, 🩷 Mood
- Long-press picker with stacked emoji breakdown on feed posts

---

## Proposed Enhancements

### 1. Streaks & Check-In Rewards
- **Daily login streak**: Award bonus points for consecutive daily opens (5 → 10 → 25 escalating)
- **Event check-in streak**: Bonus for attending events on consecutive weekends
- **Streak freeze**: Allow 1 missed day per week at Gold+ rank

### 2. Badges & Achievements
- **First Timer**: Attend your first event
- **Social Butterfly**: Add 10 friends
- **Night Owl**: Check in to 5 events after midnight
- **VIP Regular**: Attend 3 events at the same venue
- **Taste Maker**: Have 50 reactions on your posts
- **Event Creator**: Host your first event
- **Promoter Pro**: Sell 100+ tickets across events
- **City Explorer**: Attend events in 3+ different cities
- Display badges on profile with unlock dates

### 3. Leaderboards
- **Weekly city leaderboard**: Top 10 most active users per city
- **Friend leaderboard**: Rank among your connections
- **Organiser leaderboard**: Top event creators by attendance
- Reset weekly to keep competition fresh; archive monthly winners

### 4. Challenges & Missions
- **Weekly challenges**: "Attend 2 events this week" → bonus 100 pts
- **Seasonal campaigns**: NYE challenge, Summer series, Halloween hunt
- **Organiser challenges**: "Get 50 RSVPs on your next event" → featured placement
- **Collaborative missions**: "Your friend group attends 5 events together" → group reward

### 5. Exclusive Perks by Rank
| Rank | Perk |
|------|------|
| Bronze | Standard access |
| Silver | Early access to event announcements (30 min head start) |
| Gold | Priority guestlist placement, profile badge glow |
| Platinum | Exclusive discount codes (10% off tickets), skip-the-line QR |
| Diamond | VIP table upgrades, direct organiser DMs, featured profile |

### 6. Referral Program
- **Invite code**: Each user gets a unique referral code
- **Reward structure**: Inviter gets 50 pts + invitee gets 25 pts on first event attendance
- **Milestone bonuses**: 5 referrals = Silver boost, 15 referrals = Gold boost
- **Organiser referrals**: Organisers earn commission credits for referred ticket sales

### 7. Nightlife-Specific Mechanics
- **Venue loyalty cards**: Digital stamp card — attend 5 times, get a free drink voucher
- **DJ/Artist follow rewards**: Points for following DJs; get notified of their next set
- **Pre-party engagement**: Polls ("What genre tonight?"), voted options influence the DJ set
- **After-party ratings**: Rate events post-attendance; high-rated events get "Community Pick" badge
- **Dress code bonuses**: Organisers can reward themed outfit check-ins (photo verify)

### 8. Social Gamification
- **Hype score**: Posts with high reaction counts earn author bonus points
- **Wingman badge**: Invite a friend who then attends 3+ events
- **Story reactions**: Points for reacting to friends' event stories
- **Group bookings bonus**: Book tickets as a group (3+) for extra points per person

### 9. Seasonal & Limited-Time Events
- **Double XP weekends**: 2x points during major holiday weekends
- **Flash challenges**: 2-hour window challenges pushed via notification
- **Exclusive drops**: Limited vouchers or merch unlocks for top weekly performers
- **Countdown events**: NYE, Halloween, festival season with themed leaderboards

### 10. Organiser Gamification
- **Organiser tiers**: Bronze → Verified → Premium based on cumulative attendance
- **Analytics unlocks**: Higher tiers unlock deeper dashboard analytics
- **Featured placement**: Top-tier organisers get homepage feature slots
- **Revenue milestones**: Celebrate and badge ticket sale milestones (100, 500, 1000 sold)

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 High | Badges & Achievements | Medium | High engagement |
| 🔴 High | Referral Program | Medium | Growth driver |
| 🟡 Medium | Streaks | Low | Retention |
| 🟡 Medium | Rank Perks (Silver+) | Medium | Monetisation |
| 🟡 Medium | Leaderboards | Low | Competition |
| 🟢 Low | Challenges & Missions | High | Deep engagement |
| 🟢 Low | Venue Loyalty Cards | High | Venue partnerships |
| 🟢 Low | Seasonal Events | Medium | Buzz / FOMO |

---

*Last updated: 9 March 2026*
