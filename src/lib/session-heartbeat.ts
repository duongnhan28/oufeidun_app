// Connection failures are not evidence that an authenticated session was revoked.
export function isSessionInvalid(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error);
  return ['SESSION_REQUIRED', 'SESSION_REPLACED', 'ACCOUNT_DISABLED', 'UNAUTHENTICATED'].includes(message);
}

export function startSessionHeartbeat(options: {
  touch: () => Promise<void>;
  expired: (error: unknown) => void;
  unavailable: (error: unknown) => void;
  interval?: number;
}) {
  let stopped = false;
  let pending = false;
  let warned = false;
  const timer = setInterval(async () => {
    if (stopped || pending) return;
    pending = true;
    try {
      await options.touch();
      warned = false;
    } catch (error) {
      if (stopped) return;
      if (isSessionInvalid(error)) {
        stopped = true;
        clearInterval(timer);
        options.expired(error);
      } else if (!warned) {
        warned = true;
        options.unavailable(error);
      }
    } finally {
      pending = false;
    }
  }, options.interval ?? 25_000);
  return () => { stopped = true; clearInterval(timer); };
}
