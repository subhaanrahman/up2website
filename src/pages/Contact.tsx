import { useState } from "react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Contact() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
    toast.success("Thanks — we will be in touch shortly.", {
      description: "This demo site does not send email yet; wire your form action when ready.",
    });
  };

  return (
    <MarketingLayout>
      <Seo
        title="Contact"
        description="Partner with Up2 — venues, promoters, festivals, and brands. Tell us what you are building."
      />
      <div className="border-b border-border/60 py-16 md:py-20">
        <div className="container max-w-xl">
          <p className="text-label mb-3 text-primary">Contact</p>
          <h1 className="mb-4 text-4xl md:text-5xl">Let us build the next chapter</h1>
          <p className="text-lg text-muted-foreground">
            Share a few details. For production, connect this form to your CRM, email API, or automation — the UI is
            ready.
          </p>
        </div>
      </div>

      <section className="py-16 md:py-24">
        <div className="container max-w-xl">
          <form onSubmit={onSubmit} className="surface-card space-y-6 p-6 md:p-8">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required autoComplete="name" placeholder="Alex Rivera" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company / brand</Label>
              <Input id="company" name="company" placeholder="Venue, promoter, festival…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">What are you looking for?</Label>
              <Textarea
                id="message"
                name="message"
                required
                rows={5}
                placeholder="Tell us about markets, timelines, and what success looks like."
                className="resize-y min-h-[120px]"
              />
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={sent}>
              {sent ? "Message recorded" : "Send message"}
            </Button>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}
