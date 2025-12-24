import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, MessageSquare, Mail } from "lucide-react";
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

const faqs = [
  {
    question: "How do I RSVP to an event?",
    answer: "Navigate to the event page and tap the RSVP button at the bottom. For ticketed events, you'll be prompted to purchase tickets. For free events, your RSVP will be submitted for host approval."
  },
  {
    question: "Can I cancel my RSVP?",
    answer: "Yes, you can cancel your RSVP by going to your Events page, finding the event, and selecting 'Cancel RSVP'. Refund policies vary by event."
  },
  {
    question: "How do I create an event?",
    answer: "Tap the Create button from the home screen or navigate to your profile and select 'Create Event'. Fill in the event details including title, date, location, and description."
  },
  {
    question: "How do I connect with friends?",
    answer: "You can find friends by searching for their username or scanning their QR code. Once connected, you'll see their activity and can invite them to events."
  },
  {
    question: "What payment methods are accepted?",
    answer: "We accept all major credit cards, debit cards, and digital wallets including Apple Pay and Google Pay."
  },
  {
    question: "How do I get a refund?",
    answer: "Refund policies are set by event hosts. Contact the event host directly or reach out to our support team for assistance."
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Help Center</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            variant="secondary"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => setShowFeedbackForm(!showFeedbackForm)}
          >
            <MessageSquare className="h-6 w-6" />
            <span className="text-sm">Send Feedback</span>
          </Button>
          <Button
            variant="secondary"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => window.location.href = "mailto:support@example.com"}
          >
            <Mail className="h-6 w-6" />
            <span className="text-sm">Contact Support</span>
          </Button>
        </div>

        {/* Feedback Form */}
        {showFeedbackForm && (
          <div className="mb-6 p-4 bg-card rounded-xl space-y-3">
            <h3 className="font-semibold text-foreground">Send Feedback</h3>
            <Textarea
              placeholder="Tell us what you think..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFeedbackForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendFeedback}>
                Send
              </Button>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card rounded-xl border-0 px-4"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default HelpCenter;
