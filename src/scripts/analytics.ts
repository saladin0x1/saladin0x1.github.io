interface AnalyticsClient {
  init: (key: string, options: Record<string, unknown>) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
}

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

let client: AnalyticsClient | null = null;
let clientPromise: Promise<AnalyticsClient | null> | null = null;

function loadAnalytics(): Promise<AnalyticsClient | null> {
  if (!POSTHOG_KEY || typeof window === 'undefined') return Promise.resolve(null);
  if (client) return Promise.resolve(client);
  if (clientPromise) return clientPromise;

  clientPromise = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        persistence: 'localStorage',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: false,
      });
      client = posthog;
      return client;
    })
    .catch(() => null);

  return clientPromise;
}

function runWhenIdle(task: () => void): void {
  if (typeof window === 'undefined') return;
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(task, { timeout: 2500 });
  } else {
    window.setTimeout(task, 1500);
  }
}

/** Load analytics only after the visible page and cat are ready. */
export function initAnalytics(): void {
  if (!POSTHOG_KEY) return;
  runWhenIdle(() => { void loadAnalytics(); });
}

/** Events are best-effort and must never enter the rendering critical path. */
export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  void loadAnalytics().then((posthog) => posthog?.capture(event, properties));
}
