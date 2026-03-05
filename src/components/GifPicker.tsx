import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { toast } from "sonner";

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  children?: React.ReactNode;
}

const GifPicker = ({ onSelect, children }: GifPickerProps) => {
  const handleClick = () => {
    toast.info("GIF picker coming soon!");
  };

  return children ? (
    <div onClick={handleClick}>{children}</div>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-primary"
      onClick={handleClick}
    >
      <Smile className="h-4 w-4" />
    </Button>
  );
};

export default GifPicker;
