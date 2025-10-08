-- Add DELETE policies for crypto_reports
CREATE POLICY "Users can delete their own crypto reports"
ON crypto_reports
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policies for feedback_responses
CREATE POLICY "Users can delete their own feedback responses"
ON feedback_responses
FOR DELETE
USING (auth.uid() = user_id);
