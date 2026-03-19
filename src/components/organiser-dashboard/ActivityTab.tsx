import { BarChart3, Heart, Share2, MessageCircle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MetricPlaceholder = ({
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

const ActivityTab = () => {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-tile-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Engagement Overview</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            <Lock className="h-2.5 w-2.5 mr-0.5" />
            Premium
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Detailed engagement metrics including post interactions, event shares, and audience demographics will be available with a business subscription.
        </p>
      </div>

      <MetricPlaceholder
        icon={Heart}
        title="Post Engagement"
        description="Track likes, reposts, and comments across all your posts. See which content resonates most with your audience."
      />

      <MetricPlaceholder
        icon={Share2}
        title="Event Shares & Referrals"
        description="Monitor how your events are being shared, track referral sources, and measure word-of-mouth growth."
      />

      <MetricPlaceholder
        icon={MessageCircle}
        title="Audience Insights"
        description="Understand your audience with demographic breakdowns, peak engagement times, and follower growth trends."
      />
    </div>
  );
};

export default ActivityTab;
