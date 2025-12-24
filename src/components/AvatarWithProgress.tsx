import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarWithProgressProps {
  src?: string;
  fallback: string;
  progress: number; // 0-100
  size?: number;
}

const AvatarWithProgress = ({ src, fallback, progress, size = 112 }: AvatarWithProgressProps) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const avatarSize = size - strokeWidth * 4;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background circle (track) */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Avatar centered inside */}
      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        <Avatar
          className="border-2 border-background"
          style={{ width: avatarSize, height: avatarSize }}
        >
          <AvatarImage src={src} />
          <AvatarFallback className="text-2xl bg-card text-foreground font-bold">
            {fallback}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
};

export default AvatarWithProgress;
