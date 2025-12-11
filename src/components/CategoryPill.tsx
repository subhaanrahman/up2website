import { cn } from "@/lib/utils";

interface CategoryPillProps {
  label: string;
  icon?: string;
  active?: boolean;
  onClick?: () => void;
}

const CategoryPill = ({ label, icon, active, onClick }: CategoryPillProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground border border-border"
      )}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  );
};

export default CategoryPill;
