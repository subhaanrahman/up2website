import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import {
  FormFieldCard,
  FormFieldLabel,
  FormFlowHeader,
  FormFlowMain,
  FormFlowScreen,
} from "@/components/form-flow/FormFlowLayout";

const faqs = [
  {
    question: "How do I RSVP to an event?",
    answer:
      "Navigate to the event page and tap the RSVP button at the bottom. For ticketed events, you'll be prompted to purchase tickets. For free events, your RSVP will be submitted for host approval.",
  },
  {
    question: "Can I cancel my RSVP?",
    answer:
      "Yes, you can cancel your RSVP by going to your Events page, finding the event, and selecting 'Cancel RSVP'. Refund policies vary by event.",
  },
  {
    question: "How do I create an event?",
    answer:
      "Tap the Create button from the home screen or navigate to your profile and select 'Create Event'. Fill in the event details including title, date, location, and description.",
  },
  {
    question: "How do I connect with friends?",
    answer:
      "You can find friends by searching for their username or scanning their QR code. Once connected, you'll see their activity and can invite them to events.",
  },
  {
    question: "What payment methods are accepted?",
    answer: "We accept all major credit cards, debit cards, and digital wallets including Apple Pay and Google Pay.",
  },
  {
    question: "How do I get a refund?",
    answer:
      "Refund policies are set by event hosts. Contact the event host directly or reach out to our support team for assistance.",
  },
];

const HelpCenter = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState("");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const handleSendFeedback = () => {
    if (!feedback.trim()) return;

    toast({
      title: "Feedback sent!",
      description: "Thank you for your feedback. We'll review it shortly.",
    });
    setFeedback("");
    setShowFeedbackForm(false);
  };

  return (
    <FormFlowScreen>
      <FormFlowHeader title="Help center" onBack={() => navigate(-1)} balanceRight />
      <FormFlowMain withBottomNav>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            type="button"
            variant="secondary"
            className="h-auto py-4 flex flex-col items-center gap-2 rounded-tile border border-border/50 bg-card"
            onClick={() => setShowFeedbackForm(!showFeedbackForm)}
          >
            <MessageSquare className="h-6 w-6" />
            <span className="text-xs font-bold tracking-widest uppercase">Feedback</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-auto py-4 flex flex-col items-center gap-2 rounded-tile border border-border/50 bg-card"
            onClick={() => {
              window.location.href = "mailto:support@example.com";
            }}
          >
            <Mail className="h-6 w-6" />
            <span className="text-xs font-bold tracking-widest uppercase">Email</span>
          </Button>
        </div>

        {showFeedbackForm && (
          <FormFieldCard className="mb-6 px-4 pt-4 pb-4">
            <FormFieldLabel>Send feedback</FormFieldLabel>
            <Textarea
              placeholder="Tell us what you think…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px] border-border/60 bg-background/50 rounded-tile text-[15px] resize-none"
            />
            <div className="flex gap-2 mt-3">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowFeedbackForm(false)}>
                Cancel
              </Button>
              <Button type="button" className="rounded-full font-bold tracking-widest text-xs" onClick={handleSendFeedback}>
                Send
              </Button>
            </div>
          </FormFieldCard>
        )}

        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-3">FAQ</p>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-tile border border-border/50 px-4 data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-4 text-[15px] font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 text-sm leading-relaxed">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </FormFlowMain>

      <BottomNav />
    </FormFlowScreen>
  );
};

export default HelpCenter;
