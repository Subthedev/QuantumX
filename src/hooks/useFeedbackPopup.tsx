import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Production-grade timing: 60 seconds initial, with smart retry logic
const INITIAL_POPUP_DELAY = 60000; // 60 seconds as requested
const RETRY_DELAY = 300000; // 5 minutes for retry if closed
const COOLDOWN_PERIOD = 86400000; // 24 hours between sessions

export function useFeedbackPopup() {
  const { user } = useAuth();
  const [shouldShowFeedback, setShouldShowFeedback] = useState(false);
  const [hasShownInSession, setHasShownInSession] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user profile
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        console.log('[Feedback] Fetching profile for user:', user.email);
        const { data, error } = await supabase
          .from('profiles')
          .select('feedback_count, last_feedback_shown, credits')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('[Feedback] Error fetching profile:', error);
          setIsLoading(false);
          return;
        }

        console.log('[Feedback] Profile data:', data);
        setUserProfile(data);
        setIsLoading(false);
      } catch (err) {
        console.error('[Feedback] Unexpected error:', err);
        setIsLoading(false);
      }
    };

    fetchProfile();

    // Subscribe to profile changes
    const subscription = supabase
      .channel('profile_feedback_changes')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('[Feedback] Profile updated:', payload.new);
          setUserProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Handle popup timing
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Early exits
    if (!user || isLoading || !userProfile || hasShownInSession) {
      console.log('[Feedback] Early exit - User:', !!user, 'Loading:', isLoading, 'Profile:', !!userProfile, 'Shown:', hasShownInSession);
      return;
    }
    
    // Check if user already submitted feedback (except test email)
    const isTestUser = user.email === 'contactsubhrajeet@gmail.com';
    if (userProfile.feedback_count > 0 && !isTestUser) {
      console.log('[Feedback] User already submitted feedback, skipping popup');
      return;
    }

    // Check cooldown period (except for first-time users and test user)
    if (userProfile.last_feedback_shown && !isTestUser) {
      const timeSinceLastShown = Date.now() - new Date(userProfile.last_feedback_shown).getTime();
      if (timeSinceLastShown < COOLDOWN_PERIOD) {
        console.log('[Feedback] Still in cooldown period, skipping popup');
        return;
      }
    }

    console.log('[Feedback] Setting timer for popup in 60 seconds');
    
    // Set timer for popup
    timerRef.current = setTimeout(() => {
      console.log('[Feedback] Timer triggered, showing popup');
      setShouldShowFeedback(true);
      setHasShownInSession(true);
      
      // Update last shown timestamp
      supabase
        .from('profiles')
        .update({ last_feedback_shown: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('[Feedback] Error updating last_feedback_shown:', error);
          }
        });
    }, INITIAL_POPUP_DELAY);

    // Cleanup function
    return () => {
      if (timerRef.current) {
        console.log('[Feedback] Cleaning up timer');
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user, userProfile, isLoading, hasShownInSession]);

  const handleFeedbackClose = () => {
    console.log('[Feedback] User closed feedback form');
    setShouldShowFeedback(false);
    
    // Allow retry after 5 minutes if user didn't submit
    if (userProfile?.feedback_count === 0) {
      setTimeout(() => {
        console.log('[Feedback] Resetting for retry');
        setHasShownInSession(false);
      }, RETRY_DELAY);
    }
  };

  const handleFeedbackComplete = async () => {
    console.log('[Feedback] User completed feedback form');
    setShouldShowFeedback(false);
    setHasShownInSession(true);
    
    // Refresh profile to get updated data
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('feedback_count, last_feedback_shown, credits')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('[Feedback] Error refreshing profile:', error);
      } else {
        console.log('[Feedback] Profile refreshed:', data);
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