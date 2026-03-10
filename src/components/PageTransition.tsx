import { useLocation } from "react-router-dom";
import { ReactNode } from "react";

const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <div
      key={location.key}
      className="animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both"
    >
      {children}
    </div>
  );
};

export default PageTransition;
