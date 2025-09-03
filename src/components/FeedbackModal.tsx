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
      title: "Satisfaction & Usage",
      question: "How satisfied are you with IgniteX's prediction accuracy and how frequently do you use our platform?",
      type: "radio",
      icon: <Star className="h-5 w-5" />,
      options: [
        { value: "very_satisfied_daily", label: "Very satisfied, use daily for most trading decisions" },
        { value: "satisfied_weekly", label: "Satisfied, use 2-3 times per week for key trades" },
        { value: "somewhat_satisfied_occasional", label: "Somewhat satisfied, use occasionally when uncertain" },
        { value: "not_satisfied_rarely", label: "Not very satisfied, rarely use despite having access" }
      ]
    },
    {
      id: "question_2",
      title: "Most Valuable Feature",
      question: "Which specific feature of IgniteX provides you the most value in your crypto trading?",
      type: "text",
      icon: <Zap className="h-5 w-5" />
    },
    {
      id: "question_3",
      title: "Challenges & Frustrations",
      question: "What is the biggest challenge or frustration you currently face when using IgniteX that prevents you from relying on it more heavily for your trading decisions?",
      type: "text",
      icon: <Zap className="h-5 w-5" />
    },
    {
      id: "question_4",
      title: "Feature Requests",
      question: "If you could add ONE new feature to IgniteX tomorrow, what would it be? Or what feature needs improvement for you to become a more active user for our platform?",
      type: "text",
      icon: <Gift className="h-5 w-5" />
    },
    {
      id: "question_5",
      title: "Would You Recommend?",
      question: "How likely are you to recommend IgniteX to a fellow crypto trader?",
      type: "radio",
      icon: <Star className="h-5 w-5" />,
      options: [
        { value: "extremely_likely", label: "Extremely likely (9-10) - I actively recommend it" },
        { value: "very_likely", label: "Very likely (7-8) - I would recommend with minor reservations" },
        { value: "somewhat_likely", label: "Somewhat likely (5-6) - I might recommend in specific situations" },
        { value: "not_likely", label: "Not likely (0-4) - I would not recommend in its current state" }
      ]
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
      <DialogContent className="sm:max-w-[600px] !bg-white dark:!bg-gray-900 !border-2 !border-gray-300 dark:!border-gray-700 !shadow-2xl">
        <DialogHeader>
          {currentStep === 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                🎯 Our Mission: Build the World's Most Accurate Crypto Prediction Engine
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Your honest feedback directly shapes our AI algorithms. Every response helps thousands of traders make better decisions.
              </p>
              <p className="text-xs font-semibold text-accent">
                💡 Your insights = Better predictions for everyone
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-full">
                {currentQuestion.icon}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {currentQuestion.title}
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Question {currentStep + 1} of {questions.length} • {currentStep === questions.length - 1 ? 'Final question' : 'Your input matters'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 bg-accent/10 rounded-full">
              <Gift className="h-4 w-4 text-accent" />
              <span className="text-sm font-bold text-accent">+5</span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
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
                placeholder="Be honest and specific - your genuine feedback shapes our AI improvements..."
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
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold"
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