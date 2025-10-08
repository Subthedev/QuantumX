import { z } from 'zod';

export const cryptoReportSchema = z.object({
  coin_symbol: z.string().min(1).max(10).toUpperCase(),
  prediction_summary: z.string().min(1).max(500),
  confidence_score: z.number().min(0).max(100),
  report_data: z.record(z.any())
});

export const feedbackSchema = z.object({
  message: z.string().min(1).max(1000),
  rating: z.number().min(1).max(5).optional()
});

export const portfolioSchema = z.object({
  coin_id: z.string().min(1),
  amount: z.number().positive(),
  purchase_price: z.number().positive()
});

export type CryptoReportInput = z.infer<typeof cryptoReportSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type PortfolioInput = z.infer<typeof portfolioSchema>;
