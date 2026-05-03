import privacyMd from "@/content/legal/privacy.md?raw";
import { LegalPage } from "@/components/marketing/LegalPage";
import { PRODUCT_NAME } from "@/lib/brand";

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="March 8, 2026"
      markdown={privacyMd}
      description={`${PRODUCT_NAME} Privacy Policy: how we collect, use, and protect your information.`}
    />
  );
}
