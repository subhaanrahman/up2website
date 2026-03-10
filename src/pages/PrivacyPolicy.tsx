import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20 animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-center px-4 py-4 relative">
          <h1 className="text-xl font-bold text-foreground text-center">PRIVACY POLICY</h1>
          <button onClick={() => navigate(-1)} className="absolute left-2 p-2 -ml-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-sm">Last updated: March 8, 2026</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">1. Information We Collect</h2>
        <p className="text-muted-foreground">We collect information you provide directly, including:</p>
        <ul className="text-muted-foreground list-disc pl-5 space-y-1">
          <li>Account information (name, phone number, email)</li>
          <li>Profile information (bio, city, avatar, social handles)</li>
          <li>Event and ticketing data</li>
          <li>Messages and social interactions</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground mt-6">2. How We Use Your Information</h2>
        <p className="text-muted-foreground">We use your information to:</p>
        <ul className="text-muted-foreground list-disc pl-5 space-y-1">
          <li>Provide, maintain, and improve the Service</li>
          <li>Process transactions and send related information</li>
          <li>Send notifications and updates</li>
          <li>Personalise your experience and recommend events</li>
          <li>Ensure safety and security of the platform</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground mt-6">3. Information Sharing</h2>
        <p className="text-muted-foreground">We do not sell your personal information. We may share information with:</p>
        <ul className="text-muted-foreground list-disc pl-5 space-y-1">
          <li>Event organisers (for events you attend)</li>
          <li>Service providers who assist our operations</li>
          <li>Law enforcement when required by law</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground mt-6">4. Data Security</h2>
        <p className="text-muted-foreground">We implement industry-standard security measures to protect your data, including encryption in transit and at rest. However, no system is completely secure.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">5. Your Rights</h2>
        <p className="text-muted-foreground">You have the right to:</p>
        <ul className="text-muted-foreground list-disc pl-5 space-y-1">
          <li>Access and download your personal data</li>
          <li>Correct inaccurate information</li>
          <li>Delete your account and associated data</li>
          <li>Opt out of marketing communications</li>
          <li>Control your privacy settings within the app</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground mt-6">6. Cookies & Analytics</h2>
        <p className="text-muted-foreground">We use cookies and similar technologies to improve the Service, analyse usage patterns, and personalise content.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">7. Data Retention</h2>
        <p className="text-muted-foreground">We retain your information for as long as your account is active or as needed to provide the Service. You may request deletion at any time.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">8. Children's Privacy</h2>
        <p className="text-muted-foreground">The Service is not intended for users under 18. We do not knowingly collect information from children.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">9. Changes to This Policy</h2>
        <p className="text-muted-foreground">We may update this Privacy Policy from time to time. We will notify you of significant changes through the app.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">10. Contact Us</h2>
        <p className="text-muted-foreground">For privacy-related questions, please contact us through the app's Contact Us page.</p>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
