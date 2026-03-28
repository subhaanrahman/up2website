import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <MarketingLayout>
      <Seo title="Page not found" description="The page you are looking for does not exist." />
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-label mb-2 text-muted-foreground">404</p>
        <h1 className="mb-4 text-3xl md:text-4xl">This page is not here</h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          The link may be outdated, or the page may have moved. Head back to the homepage to keep exploring Up2.
        </p>
        <Button asChild size="lg">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </MarketingLayout>
  );
};

export default NotFound;
