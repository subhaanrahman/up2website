import { Link, useNavigate } from "react-router-dom";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Music, 
  Shield, 
  HelpCircle, 
  Mail, 
  Info,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

const settingsItems = [
  { icon: SettingsIcon, label: "Manage Account", path: "/settings/account", description: "Account settings and preferences" },
  { icon: Bell, label: "Notifications", path: "/settings/notifications", description: "Manage notification preferences" },
  { icon: Music, label: "Connect Music Apps", path: "/settings/music", description: "Link your music streaming services" },
  { icon: Shield, label: "Privacy Options", path: "/settings/privacy", description: "Control your privacy settings" },
  { icon: HelpCircle, label: "Help Center", path: "/settings/help", description: "FAQs and support resources" },
  { icon: Mail, label: "Contact Us", path: "/settings/contact", description: "Get in touch with our team" },
  { icon: Info, label: "About", path: "/settings/about", description: "Learn more about the app" },
];

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
       {/* Header */}
       <header className="sticky top-0 z-40 bg-background border-b border-border">
         <div className="flex items-center justify-center px-4 py-4 relative">
           <h1 className="text-xl font-bold text-foreground text-center">SETTINGS</h1>
           <button onClick={() => navigate(-1)} className="absolute left-2 p-2 -ml-2">
             <ArrowLeft className="h-6 w-6 text-foreground" />
           </button>
         </div>
       </header>

      <main className="px-4 pt-4">
        <div className="space-y-1">
          {settingsItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-secondary transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <item.icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground truncate">{item.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Version Number */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;
