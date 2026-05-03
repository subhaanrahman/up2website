import termsMd from "@/content/legal/terms.md?raw";
import { LegalPage } from "@/components/marketing/LegalPage";
import { PRODUCT_NAME } from "@/lib/brand";

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="March 8, 2026"
      markdown={termsMd}
      description={`${PRODUCT_NAME} Terms of Service: the rules for using our social events platform.`}
    />
  );
}
