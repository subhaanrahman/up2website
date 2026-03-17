import { ReactNode, useRef, useEffect, createContext, useContext } from "react";
import DesktopSidebar from "@/components/DesktopSidebar";
import OrganiserPayoutTask from "@/components/OrganiserPayoutTask";

const PhoneFrameContext = createContext<HTMLDivElement | null>(null);

export const usePhoneFrame = () => useContext(PhoneFrameContext);

interface PhoneFrameProps {
  children: ReactNode;
}

const PhoneFrame = ({ children }: PhoneFrameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set a CSS custom property for the phone frame's position
    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        document.documentElement.style.setProperty('--phone-left', `${rect.left}px`);
        document.documentElement.style.setProperty('--phone-right', `${window.innerWidth - rect.right}px`);
        document.documentElement.style.setProperty('--phone-width', `${rect.width}px`);
      }
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  return (
    <div className="min-h-screen bg-background md:bg-[hsl(0_0%_4%)]">
      <DesktopSidebar />
      <div className="md:ml-[72px] xl:ml-[240px] md:flex md:justify-center">
        <div
          ref={containerRef}
          className="w-full md:max-w-[680px] min-h-screen bg-background md:border-x md:border-border/50 md:mt-0 md:rounded-none md:shadow-2xl"
        >
          {children}
          <OrganiserPayoutTask />
        </div>
      </div>
    </div>
  );
};

export default PhoneFrame;
