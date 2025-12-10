/**
 * Web Vitals Monitoring
 * Tracks Core Web Vitals (LCP, FID, CLS) for performance monitoring
 */

import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

const vitalsUrl = 'https://vitals.vercel-analytics.com/v1/vitals';

function getConnectionSpeed(): string {
  const conn = (navigator as any).connection;
  return conn?.effectiveType || 'unknown';
}

export function sendToAnalytics(metric: Metric, options: { params?: Record<string, string>; path: string; analyticsId: string }) {
  const body = {
    dsn: options.analyticsId,
    id: metric.id,
    page: options.path,
    href: location.href,
    event_name: metric.name,
    value: metric.value.toString(),
    speed: getConnectionSpeed(),
  };

  if (navigator.sendBeacon) {
    navigator.sendBeacon(vitalsUrl, JSON.stringify(body));
  } else {
    fetch(vitalsUrl, {
      body: JSON.stringify(body),
      method: 'POST',
      keepalive: true,
    });
  }
}

export function initWebVitals() {
  const analyticsId = import.meta.env.VITE_ANALYTICS_ID || 'ignitex-production';
  const path = window.location.pathname;

  try {
    onCLS((metric) => {
      sendToAnalytics(metric, { path, analyticsId });
      if (import.meta.env.DEV && metric.value > 0.1) {
        console.warn('CLS (Cumulative Layout Shift) is high:', metric.value);
      }
    });

    onINP((metric) => {
      sendToAnalytics(metric, { path, analyticsId });
      if (import.meta.env.DEV && metric.value > 200) {
        console.warn('INP (Interaction to Next Paint) is high:', metric.value, 'ms');
      }
    });

    onLCP((metric) => {
      sendToAnalytics(metric, { path, analyticsId });
      if (import.meta.env.DEV && metric.value > 2500) {
        console.warn('LCP (Largest Contentful Paint) is slow:', metric.value, 'ms');
      }
    });

    onFCP((metric) => {
      sendToAnalytics(metric, { path, analyticsId });
      if (import.meta.env.DEV && metric.value > 1800) {
        console.warn('FCP (First Contentful Paint) is slow:', metric.value, 'ms');
      }
    });

    onTTFB((metric) => {
      sendToAnalytics(metric, { path, analyticsId });
      if (import.meta.env.DEV && metric.value > 800) {
        console.warn('TTFB (Time to First Byte) is slow:', metric.value, 'ms');
      }
    });
  } catch (err) {
    // Silently fail in production
    if (import.meta.env.DEV) {
      console.error('Error initializing Web Vitals:', err);
    }
  }
}
