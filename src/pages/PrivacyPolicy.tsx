import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";

const PrivacyPolicy = () => {
  return (
    <MarketingLayout>
      <Seo title="Privacy Policy" description="Privacy Policy for Up2." />
      <div className="border-b border-border/60 py-12 md:py-16">
        <div className="container max-w-2xl">
          <h1 className="mb-2 text-center text-3xl md:text-4xl">Privacy Policy</h1>
          <p className="text-center text-sm text-muted-foreground">Last updated: March 8, 2026</p>
        </div>
      </div>

      <div className="container max-w-2xl py-10 md:py-14">
        <main className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:text-muted-foreground prose-li:text-muted-foreground">
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly, including:</p>
          <ul>
            <li>Account information (name, phone number, email)</li>
            <li>Profile information (bio, city, avatar, social handles)</li>
            <li>Event and ticketing data</li>
            <li>Messages and social interactions</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide, maintain, and improve the Service</li>
            <li>Process transactions and send related information</li>
            <li>Send notifications and updates</li>
            <li>Personalise your experience and recommend events</li>
            <li>Ensure safety and security of the platform</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>We do not sell your personal information. We may share information with:</p>
          <ul>
            <li>Event organisers (for events you attend)</li>
            <li>Service providers who assist our operations</li>
            <li>Law enforcement when required by law</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data, including encryption in transit and at
            rest. However, no system is completely secure.
          </p>

          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access and download your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and associated data</li>
            <li>Opt out of marketing communications</li>
            <li>Control your privacy settings within the app</li>
          </ul>

          <h2>6. Cookies &amp; Analytics</h2>
          <p>
            We use cookies and similar technologies to improve the Service, analyse usage patterns, and personalise
            content.
          </p>

          <h2>7. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide the Service. You may
            request deletion at any time.
          </p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>The Service is not intended for users under 18. We do not knowingly collect information from children.</p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes through the app
            or this website.
          </p>

          <h2>10. Contact Us</h2>
          <p>For privacy-related questions, please contact us via the Contact page on this website.</p>
        </main>
      </div>
    </MarketingLayout>
  );
};

export default PrivacyPolicy;
