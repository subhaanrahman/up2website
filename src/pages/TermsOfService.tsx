import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";

const TermsOfService = () => {
  return (
    <MarketingLayout>
      <Seo title="Terms of Service" description="Terms of Service for Up2." />
      <div className="border-b border-border/60 py-12 md:py-16">
        <div className="container max-w-2xl">
          <h1 className="mb-2 text-center text-3xl md:text-4xl">Terms of Service</h1>
          <p className="text-center text-sm text-muted-foreground">Last updated: March 8, 2026</p>
        </div>
      </div>

      <div className="container max-w-2xl py-10 md:py-14">
        <main className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:text-muted-foreground prose-li:text-muted-foreground">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Up2 application (&quot;Service&quot;), you agree to be bound by these Terms of
            Service. If you do not agree, do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Up2 is a social events platform that allows users to discover, create, and manage events, connect with other
            users, and purchase tickets.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You must provide accurate information when creating an account. You are responsible for maintaining the
            security of your account and all activities under it. You must be at least 18 years old to use this Service.
          </p>

          <h2>4. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Post false, misleading, or fraudulent content</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Attempt to gain unauthorised access to the Service</li>
            <li>Infringe on intellectual property rights</li>
          </ul>

          <h2>5. Event Organisers</h2>
          <p>
            Event organisers are responsible for the accuracy of event information, compliance with local laws and
            regulations, and fulfilling obligations to ticket purchasers.
          </p>

          <h2>6. Payments &amp; Refunds</h2>
          <p>
            All ticket purchases are subject to the event organiser&apos;s refund policy. Up2 facilitates payments but is
            not responsible for event cancellations or changes made by organisers.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            All content, trademarks, and materials on the Service are owned by Up2 or its licensors. You retain
            ownership of content you post but grant Up2 a non-exclusive licence to use, display, and distribute it on the
            platform.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            Up2 is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect,
            incidental, or consequential damages arising from your use of the Service.
          </p>

          <h2>9. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for violations of these Terms or for
            any other reason at our discretion.
          </p>

          <h2>10. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance
            of the revised Terms.
          </p>

          <h2>11. Contact</h2>
          <p>For questions about these Terms, please contact us via the Contact page on this website.</p>
        </main>
      </div>
    </MarketingLayout>
  );
};

export default TermsOfService;
