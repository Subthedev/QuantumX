import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Production-grade timing strategy based on user engagement psychology:
// - Initial popup: After 60 seconds (quick enough to catch engaged users)
// - Second attempt: 5 minutes later (if declined, gives breathing room)
// - Third attempt: Next session or 24 hours later
// - Never spam: Max 1 popup per session after submission

const INITIAL_POPUP_DELAY = 60000; // 60 seconds as requested
const SECOND_ATTEMPT_DELAY = 300000; // 5 minutes
const SESSION_LIMIT = 1; // Only show once per session after initial attempts
const COOLDOWN_PERIOD = 86400000; // 24 hours between attempts

export function useFeedbackPopup() {
  const { user } = useAuth();
  const [shouldShowFeedback, setShouldShowFeedback] = useState(false);
  const [hasShownInSession, setHasShownInSession] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [userProfile, setUserProfile] = useState<any>(null);
  const [sessionStartTime] = useState(Date.now());
  const [attemptCount, setAttemptCount] = useState(0);

  // Track user activity for engagement detection
  useEffect(() => {
    const handleActivity = () => {
      setLastActivityTime(Date.now());
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, []);

  // Fetch user profile with credits and feedback data
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

    // Subscribe to profile changes
    const subscription = supabase
      .channel('profile_changes')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        fetchProfile
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Strategic popup timing with psychological triggers
  useEffect(() => {
    if (!user || !userProfile || hasShownInSession) return;
    
    // Don't show if user already submitted feedback (except for test email)
    if (userProfile.feedback_count > 0 && user.email !== 'contactsubhrajeet@gmail.com') return;

    // Check cooldown period
    if (userProfile.last_feedback_shown) {
      const timeSinceLastShown = Date.now() - new Date(userProfile.last_feedback_shown).getTime();
      
      // Respect 24-hour cooldown for better user experience
      if (timeSinceLastShown < COOLDOWN_PERIOD && attemptCount > 0) return;
    }

    let timeoutId: NodeJS.Timeout;

    const showPopupWithEngagementCheck = async () => {
      // Ensure user is actively engaged (activity within last 30 seconds)
      const timeSinceActivity = Date.now() - lastActivityTime;
      const isEngaged = timeSinceActivity < 30000;
      
      // Check if user has low credits (psychological trigger)
      const hasLowCredits = userProfile.credits <= 5;
      
      // Only show if user is engaged
      if (isEngaged && !hasShownInSession) {
        setShouldShowFeedback(true);
        setHasShownInSession(true);
        setAttemptCount(prev => prev + 1);
        
        // Update last shown timestamp
        await supabase
          .from('profiles')
          .update({ last_feedback_shown: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    };

    // Calculate strategic delay based on user behavior
    const getStrategicDelay = () => {
      const timeOnSite = Date.now() - sessionStartTime;
      
      // First attempt: 60 seconds (as requested)
      if (attemptCount === 0) {
        return INITIAL_POPUP_DELAY;
      }
      
      // Second attempt: Only if user has been engaged for 5+ minutes
      if (attemptCount === 1 && timeOnSite >= SECOND_ATTEMPT_DELAY) {
        return SECOND_ATTEMPT_DELAY;
      }
      
      // No more attempts in this session
      return null;
    };

    const delay = getStrategicDelay();
    
    if (delay !== null) {
      timeoutId = setTimeout(showPopupWithEngagementCheck, delay);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, userProfile, lastActivityTime, sessionStartTime, hasShownInSession, attemptCount]);

  const handleFeedbackClose = () => {
    setShouldShowFeedback(false);
    
    // If user closes without submitting, prepare for next attempt
    if (attemptCount < 2) {
      setTimeout(() => {
        setHasShownInSession(false);
      }, SECOND_ATTEMPT_DELAY);
    }
  };

  const handleFeedbackComplete = async () => {
    setShouldShowFeedback(false);
    setHasShownInSession(true); // Prevent further popups this session
    
    // Refresh profile to get updated feedback count and credits
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