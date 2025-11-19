# 🎨 Mock Trading Page - Visual Design Guide

## Header Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [BTC/USDT ▼]  │  Price: $67,234.56 [+2.34%]  │  High: $68K │ Low: $66K │ Vol: $45B │  │
│               │                                │                                        │  │
│  Market       │  Current Price (Flash Animated) │  Market Stats  │  Equity | PnL | ...│⚙│
└─────────────────────────────────────────────────────────────────────────────────────────┘
    56px gap        Border separator (4px)         4px gaps       4px gaps      Actions
```

## Color Coding System

### Price Changes
```
┌─────────────────────┐
│ Price: $67,234.56   │  ← Base color (foreground)
│ [+2.34%]            │  ← Green background (bg-green-500/10)
│  ▲ Flash green      │  ← Animated when price goes UP
└─────────────────────┘

┌─────────────────────┐
│ Price: $67,234.56   │  ← Base color (foreground)
│ [-1.23%]            │  ← Red background (bg-red-500/10)
│  ▼ Flash red        │  ← Animated when price goes DOWN
└─────────────────────┘
```

### P&L Indicators
```
Positive P&L: text-green-500 + "+" prefix
Negative P&L: text-red-500 + "-" prefix
24h High:     text-green-500 (always)
24h Low:      text-red-500 (always)
```

## Typography Hierarchy

```
┌────────────────────────────────────┐
│ PRICE              ← 10px, uppercase, muted (label)
│ $67,234.56         ← 18px, bold, tabular-nums (value)
│
│ TOTAL PNL          ← 10px, uppercase, muted (label)
│ +12.34%            ← 16px, bold, colored (value)
│
│ 24H VOLUME         ← 10px, uppercase, muted (label)
│ $45.2B             ← 14px, semibold (value)
└────────────────────────────────────┘
```

## Spacing Standards

### Header Sections:
- Gap between sections: **6px** (gap-6)
- Section padding: **4px** horizontal (px-4)
- Border separators: **1px** with 40% opacity
- Icon size: **4px** (h-4 w-4) for buttons, **5px** (h-5 w-5) for coins

### Button Sizing:
- Action buttons: **9px × 9px** (h-9 w-9)
- Market selector: **9px height**, auto width
- Icons: **4px × 4px** (lucide icons)

## Animation Timings

### Price Flash Effect:
```
State: Normal → Price Update Detected → Flash (500ms) → Normal

Timeline:
0ms    ─── Price changes
0ms    ─── Flash animation starts (scale-105 + color)
300ms  ─── Smooth transition (transition-all duration-300)
500ms  ─── Flash ends, return to normal
```

### Chart Loading:
```
Loading State:
┌──────────────────────────────────┐
│                                  │
│         📈 (pulse)               │  ← TrendingUp icon
│         ▓▓▓▓▓▓                   │  ← Blur glow effect
│                                  │
│     ▬▬▬▬▬▬▬▬▬▬▬▬                 │  ← Skeleton line
│     ▬▬▬▬▬▬▬▬                     │  ← Skeleton line
└──────────────────────────────────┘

Loaded State:
┌──────────────────────────────────┐
│     ╱╲    ╱╲                     │
│    ╱  ╲  ╱  ╲   ╱╲               │  ← TradingView Chart
│   ╱    ╲╱    ╲ ╱  ╲              │
│  ╱            ╲    ╲             │
└──────────────────────────────────┘
```

## Real-Time Updates Visual Indicator

### Normal State:
```
Price: $67,234.56
       ^^^^^^^^^^ (normal size, normal color)
```

### Price Goes UP:
```
Price: $67,345.78
       ^^^^^^^^^^ (scale-105, text-green-500, 300ms transition)
```

### Price Goes DOWN:
```
Price: $67,123.45
       ^^^^^^^^^^ (scale-105, text-red-500, 300ms transition)
```

### Back to Normal (after 500ms):
```
Price: $67,123.45
       ^^^^^^^^^^ (scale-100, normal color, 300ms transition)
```

## Interactive States

### Buttons:
```
Normal:  bg-transparent
Hover:   bg-accent
Active:  bg-accent + scale-95
```

### Market Selector:
```
┌─────────────────────┐
│ 🪙 BTC/USDT ▼      │  ← Normal: border-border/60
└─────────────────────┘

┌─────────────────────┐
│ 🪙 BTC/USDT ▼      │  ← Hover: border-border + bg-accent
└─────────────────────┘
```

## Number Formatting Rules

### Prices:
```typescript
// Prices ≥ $1:  Show 2 decimals
$67,234.56  ← currentPrice.toLocaleString(undefined, {
               minimumFractionDigits: 2,
               maximumFractionDigits: 2
             })

// Prices < $1:  Show 6 decimals
$0.000456   ← currentPrice.toFixed(6)
```

### Percentages:
```typescript
+2.34%   ← Always show sign (+/-)
-1.23%   ← Always 2 decimal places
         ← .toFixed(2)
```

### Large Numbers:
```typescript
$45.2B   ← Billions with 2 decimals
$1.3M    ← Millions with 1-2 decimals
         ← (value / 1e9).toFixed(2) + 'B'
```

## Border & Separator System

### Vertical Separators:
```
Section A │ Section B │ Section C
          ↑           ↑
          border-l border-border/40 pl-4
```

### Horizontal Separators:
```
Header
────────────────────────  ← border-b border-border/40
Chart Area
────────────────────────  ← border-t border-border/40
Bottom Panel
```

## Chart Integration

### Chart Container:
```
┌─────────────────────────────────────┐
│ flex-1 (takes remaining space)     │
│ bg-background                       │
│ border-r border-border/40           │
│ relative (for skeleton overlay)    │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ <TradingViewChart />        │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Smooth Blend:
- Background matches page: `bg-background`
- Border opacity: `border-border/40`
- No harsh edges or misalignment
- Seamless integration with order panel

## Accessibility Features

### Font Weights:
- Labels: `font-medium` (500)
- Values: `font-semibold` (600) or `font-bold` (700)
- Important data: Always bold

### Contrast:
- Labels: `text-muted-foreground` (reduced opacity)
- Values: `text-foreground` (full opacity)
- P&L: High contrast colors (green-500/red-500)

### Spacing for Readability:
- Minimum gap between sections: 4px
- Labels above values: 0.5-1px gap (mb-0.5)
- Clear visual separation with borders

## Professional Standards Met

✅ **Bloomberg Terminal** - Clean data presentation
✅ **Binance** - Professional header layout
✅ **Hyperliquid** - Minimalist, functional design
✅ **TradingView** - Smooth chart integration
✅ **Interactive Brokers** - Real-time updates
✅ **Robinhood** - Intuitive color coding

## Quick Reference: CSS Classes

### Spacing:
- `gap-1`: 4px
- `gap-2`: 8px
- `gap-4`: 16px
- `gap-6`: 24px
- `px-4`: 16px horizontal padding

### Typography:
- `text-xs`: 12px
- `text-sm`: 14px
- `text-base`: 16px
- `text-lg`: 18px
- `font-medium`: 500 weight
- `font-semibold`: 600 weight
- `font-bold`: 700 weight
- `tabular-nums`: Monospace numbers (aligned)

### Colors:
- `text-foreground`: Primary text
- `text-muted-foreground`: Secondary text
- `text-green-500`: Positive values
- `text-red-500`: Negative values
- `bg-green-500/10`: Positive background (10% opacity)
- `bg-red-500/10`: Negative background (10% opacity)
- `border-border/40`: Borders (40% opacity)

### Transitions:
- `transition-all`: All properties
- `transition-colors`: Colors only
- `duration-300`: 300ms
- `hover:bg-accent`: Hover background
- `scale-105`: Slight zoom (5%)

---

**Visual Result**: A professional, Bloomberg-style trading interface with real-time updates, smooth animations, and clear visual hierarchy! 🚀
