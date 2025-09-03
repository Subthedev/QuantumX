import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Gift, Star, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function FeedbackModal({ isOpen, onClose, onComplete }: FeedbackModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    question_1: "",
    question_2: "",
    question_3: "",
    question_4: "",
    question_5: ""
  });

  const questions = [
    {
      id: "question_1",
      title: "What's your vision?",
      question: "What's the ONE feature you deeply crave from IgniteX to stay ahead in the crypto market?",
      type: "text",
      icon: <Star className="h-5 w-5" />
    },
    {
      id: "question_2",
      title: "Your trading style",
      question: "What's the ONE outcome you want most from a crypto prediction tool?",
      type: "radio",
      icon: <Zap className="h-5 w-5" />,
      options: [
        { value: "intraday", label: "Precise intraday entries (0–24h)" },
        { value: "swing", label: "Swing entries (1–7 days)" },
        { value: "exit", label: "Exit timing with TP/SL" },
        { value: "longterm", label: "Long-term trend bias (1–12 months)" }
      ]
    },
    {
      id: "question_3",
      title: "Level up your game",
      question: "The ONE feature that would most improve your results next",
      type: "radio",
      icon: <Zap className="h-5 w-5" />,
      options: [
        { value: "autotrading", label: "Auto-trading via exchange API" },
        { value: "alerts", label: "Faster alerts (<30s)" },
        { value: "exchange", label: "Support my exchange/pairs" },
        { value: "guidance", label: "Per-signal explanations & risk guidance" }
      ]
    },
    {
      id: "question_4",
      title: "Value perception",
      question: "If IgniteX reliably delivered your chosen outcome, what monthly price would you pay?",
      type: "radio",
      icon: <Gift className="h-5 w-5" />,
      options: [
        { value: "0", label: "₹0 (I wouldn't pay)" },
        { value: "499", label: "₹499" },
        { value: "999", label: "₹999" },
        { value: "1999", label: "₹1,999+" }
      ]
    },
    {
      id: "question_5",
      title: "Help us improve",
      question: "Overall experience with IgniteX today and how can we improve?",
      type: "text",
      icon: <Star className="h-5 w-5" />
    }
  ];

  const handleNext = () => {
    const currentQuestion = questions[currentStep];
    if (!answers[currentQuestion.id as keyof typeof answers]) {
      toast({
        title: "Please answer the question",
        description: "Your feedback is valuable to us!",
        variant: "destructive"
      });
      return;
    }
    
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Submit feedback
      const { error: feedbackError } = await supabase
        .from('feedback_responses')
        .insert({
          user_id: user.id,
          ...answers
        });

      if (feedbackError) throw feedbackError;

      // Grant credits
      const { error: creditError } = await supabase
        .rpc('grant_feedback_credits', {
          _user_id: user.id,
          _credits: 5
        });

      if (creditError) throw creditError;

      toast({
        title: "🎉 Thank you for your feedback!",
        description: "You've earned 5 credits! Use them to generate more crypto reports.",
        className: "bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30"
      });

      onComplete();
      onClose();
      setCurrentStep(0);
      setAnswers({
        question_1: "",
        question_2: "",
        question_3: "",
        question_4: "",
        question_5: ""
      });
    } catch (error: any) {
      toast({
        title: "Error submitting feedback",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-background border-2 border-primary/30 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-full">
                {currentQuestion.icon}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {currentQuestion.title}
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Question {currentStep + 1} of {questions.length} • Earn 5 credits
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 bg-accent/10 rounded-full">
              <Gift className="h-4 w-4 text-accent" />
              <span className="text-sm font-bold text-accent">+5</span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-medium text-foreground">
              {currentQuestion.question}
            </Label>
            
            {currentQuestion.type === "text" ? (
              <Textarea
                value={answers[currentQuestion.id as keyof typeof answers]}
                onChange={(e) => setAnswers({
                  ...answers,
                  [currentQuestion.id]: e.target.value
                })}
                placeholder="Share your thoughts..."
                className="min-h-[100px] bg-background/50 border-primary/20 focus:border-primary/40"
              />
            ) : (
              <RadioGroup
                value={answers[currentQuestion.id as keyof typeof answers]}
                onValueChange={(value) => setAnswers({
                  ...answers,
                  [currentQuestion.id]: value
                })}
                className="space-y-3"
              >
                {currentQuestion.options?.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-primary/10 hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          <div className="flex justify-between gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0 || loading}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {currentStep === questions.length - 1 ? (
                loading ? "Submitting..." : "Submit & Earn 5 Credits"
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}