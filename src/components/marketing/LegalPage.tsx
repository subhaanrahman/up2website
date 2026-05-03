import ReactMarkdown from "react-markdown";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { Reveal } from "@/components/marketing/Reveal";

type LegalPageProps = {
  title: string;
  lastUpdated: string;
  markdown: string;
  description?: string;
};

export function LegalPage({ title, lastUpdated, markdown, description }: LegalPageProps) {
  return (
    <MarketingLayout>
      <Seo title={title} description={description} />
      <div className="border-b border-border/60 bg-gradient-to-b from-card/40 to-background py-16 md:py-20">
        <Reveal className="container max-w-3xl text-center">
          <p className="text-label mb-3 text-primary">Legal</p>
          <h1 className="mb-4 text-4xl md:text-5xl">{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </Reveal>
      </div>

      <section className="border-b border-border/60 py-16 md:py-20">
        <Reveal className="container max-w-3xl">
          <div
            className={[
              "prose prose-invert max-w-none",
              "prose-headings:tracking-normal prose-headings:normal-case",
              "prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-h2:text-foreground",
              "prose-p:text-muted-foreground prose-p:leading-relaxed",
              "prose-li:text-muted-foreground prose-li:my-1",
              "prose-strong:text-foreground",
              "prose-a:text-primary hover:prose-a:text-primary/80",
            ].join(" ")}
          >
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </Reveal>
      </section>
    </MarketingLayout>
  );
}
