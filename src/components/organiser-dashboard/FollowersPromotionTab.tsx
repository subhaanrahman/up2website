import { Users, Bell, Megaphone, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FollowersPromotionTabProps {
  followerCount: number;
}

const ComingSoonCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) => (
  <div className="bg-card border border-border rounded-tile-sm p-4 flex items-start gap-3 opacity-70">
    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          <Lock className="h-2.5 w-2.5 mr-0.5" />
          Coming Soon
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

const FollowersPromotionTab = ({ followerCount }: FollowersPromotionTabProps) => {
  return (
    <div className="space-y-4">
      {/* Live follower count */}
      <div className="bg-card border border-border rounded-tile-sm p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Followers</p>
          <p
            className="text-xl font-bold text-foreground"
            style={{
              fontFamily: "'Akira Expanded', sans-serif",
              fontWeight: 900,
            }}
          >
            {followerCount}
          </p>
        </div>
      </div>

      {/* Coming soon features */}
      <ComingSoonCard
        icon={Bell}
        title="Schedule Push Notifications"
        description="Schedule and send push notifications to your followers about upcoming events, ticket drops, and announcements."
      />

      <ComingSoonCard
        icon={Megaphone}
        title="Broadcast Messaging"
        description="Send broadcast messages and event reminders to all followers or targeted segments. Drive engagement and fill events faster."
      />

      <ComingSoonCard
        icon={Users}
        title="Ad Placements & Promotions"
        description="Select and manage ad placements to boost your events. Reach new audiences and grow your following."
      />
    </div>
  );
};

export default FollowersPromotionTab;
