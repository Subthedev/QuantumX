import { z } from 'zod';

// Portfolio validation schemas
export const holdingSchema = z.object({
  quantity: z.number()
    .positive("Quantity must be positive")
    .finite("Quantity must be a valid number"),
  purchase_price: z.number()
    .positive("Purchase price must be positive")
    .finite("Purchase price must be a valid number"),
  notes: z.string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional()
});

// Profit Guard validation schemas
export const profitGuardSchema = z.object({
  entry_price: z.number()
    .positive("Entry price must be positive")
    .finite("Entry price must be a valid number"),
  quantity: z.number()
    .positive("Quantity must be positive")
    .finite("Quantity must be a valid number"),
  investment_period: z.number()
    .int("Investment period must be an integer")
    .positive("Investment period must be positive")
    .min(1, "Investment period must be at least 1 day")
    .max(365, "Investment period must be less than 365 days")
});
