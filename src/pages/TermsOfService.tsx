import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20 animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-center px-4 py-4 relative">
          <h1 className="text-xl font-bold text-foreground text-center">TERMS OF SERVICE</h1>
          <button onClick={() => navigate(-1)} className="absolute left-2 p-2 -ml-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-sm">Last updated: March 8, 2026</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground">By accessing or using the Up2 application ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">2. Description of Service</h2>
        <p className="text-muted-foreground">Up2 is a social events platform that allows users to discover, create, and manage events, connect with other users, and purchase tickets.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">3. User Accounts</h2>
        <p className="text-muted-foreground">You must provide accurate information when creating an account. You are responsible for maintaining the security of your account and all activities under it. You must be at least 18 years old to use this Service.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">4. User Conduct</h2>
        <p className="text-muted-foreground">You agree not to:</p>
        <ul className="text-muted-foreground list-disc pl-5 space-y-1">
          <li>Use the Service for any unlawful purpose</li>
          <li>Post false, misleading, or fraudulent content</li>
          <li>Harass, abuse, or harm other users</li>
          <li>Attempt to gain unauthorised access to the Service</li>
          <li>Infringe on intellectual property rights</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground mt-6">5. Event Organisers</h2>
        <p className="text-muted-foreground">Event organisers are responsible for the accuracy of event information, compliance with local laws and regulations, and fulfilling obligations to ticket purchasers.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">6. Payments & Refunds</h2>
        <p className="text-muted-foreground">All ticket purchases are subject to the event organiser's refund policy. Up2 facilitates payments but is not responsible for event cancellations or changes made by organisers.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">7. Intellectual Property</h2>
        <p className="text-muted-foreground">All content, trademarks, and materials on the Service are owned by Up2 or its licensors. You retain ownership of content you post but grant Up2 a non-exclusive licence to use, display, and distribute it on the platform.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">8. Limitation of Liability</h2>
        <p className="text-muted-foreground">Up2 is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">9. Termination</h2>
        <p className="text-muted-foreground">We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our discretion.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">10. Changes to Terms</h2>
        <p className="text-muted-foreground">We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">11. Contact</h2>
        <p className="text-muted-foreground">For questions about these Terms, please contact us through the app's Contact Us page.</p>
      </main>
    </div>
  );
};

export default TermsOfService;
