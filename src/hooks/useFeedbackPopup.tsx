import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Professional startup timing strategy:
// - First popup: After 3 minutes (180 seconds) of being logged in
// - Second popup: 10 minutes after first completion
// - Third+ popups: Every 20 minutes, but only if user has been active
// - Max 3 popups per session

const FIRST_POPUP_DELAY = 180000; // 3 minutes
const SECOND_POPUP_DELAY = 600000; // 10 minutes
const RECURRING_POPUP_DELAY = 1200000; // 20 minutes
const MAX_POPUPS_PER_SESSION = 3;

export function useFeedbackPopup() {
  const { user } = useAuth();
  const [shouldShowFeedback, setShouldShowFeedback] = useState(false);
  const [popupsShownInSession, setPopupsShownInSession] = useState(0);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [userProfile, setUserProfile] = useState<any>(null);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      setLastActivityTime(Date.now());
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);

  // Fetch user profile
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('feedback_count, last_feedback_shown, credits')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserProfile(data);
      }
    };

    fetchProfile();
  }, [user]);

  // Determine when to show feedback popup
  useEffect(() => {
    if (!user || !userProfile || popupsShownInSession >= MAX_POPUPS_PER_SESSION) return;

    // Don't show if user has plenty of credits
    if (userProfile.credits > 10) return;

    const determinePopupTiming = () => {
      const now = Date.now();
      const lastFeedbackTime = userProfile.last_feedback_shown 
        ? new Date(userProfile.last_feedback_shown).getTime() 
        : 0;
      const timeSinceLastFeedback = now - lastFeedbackTime;
      const timeSinceLastActivity = now - lastActivityTime;

      // Only show if user has been active in the last 2 minutes
      if (timeSinceLastActivity > 120000) return;

      let delay = FIRST_POPUP_DELAY;

      if (userProfile.feedback_count === 0) {
        // First time user - show after 3 minutes
        delay = FIRST_POPUP_DELAY;
      } else if (userProfile.feedback_count === 1) {
        // Second popup - 10 minutes after first
        if (timeSinceLastFeedback < SECOND_POPUP_DELAY) return;
        delay = SECOND_POPUP_DELAY;
      } else {
        // Recurring popups - every 20 minutes
        if (timeSinceLastFeedback < RECURRING_POPUP_DELAY) return;
        delay = RECURRING_POPUP_DELAY;
      }

      // Set timer to show popup
      const timer = setTimeout(() => {
        // Final activity check before showing
        const finalActivityCheck = Date.now() - lastActivityTime;
        if (finalActivityCheck < 120000) {
          setShouldShowFeedback(true);
          setPopupsShownInSession(prev => prev + 1);
        }
      }, delay);

      return timer;
    };

    const timer = determinePopupTiming();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user, userProfile, lastActivityTime, popupsShownInSession]);

  const handleFeedbackClose = () => {
    setShouldShowFeedback(false);
  };

  const handleFeedbackComplete = async () => {
    setShouldShowFeedback(false);
    // Refresh profile to get updated feedback count
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('feedback_count, last_feedback_shown, credits')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserProfile(data);
      }
    }
  };

  return {
    shouldShowFeedback,
    handleFeedbackClose,
    handleFeedbackComplete
  };
}