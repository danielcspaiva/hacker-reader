/**
 * Rate limiter for HN write operations
 *
 * Prevents hitting HN's rate limits by throttling client-side actions.
 * Conservative limit of 30 actions per minute to stay well below HN's limits.
 */

export class HNRateLimiter {
  private actionTimestamps: number[] = [];
  private readonly MAX_ACTIONS_PER_MINUTE = 30; // Conservative HN limit

  /**
   * Throttle an action - will wait if rate limit would be exceeded
   */
  async throttle(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove timestamps older than 1 minute
    this.actionTimestamps = this.actionTimestamps.filter(t => t > oneMinuteAgo);

    if (this.actionTimestamps.length >= this.MAX_ACTIONS_PER_MINUTE) {
      const oldestAction = this.actionTimestamps[0];
      const waitTime = oldestAction + 60000 - now;

      console.warn(`[HN Rate Limit] Waiting ${Math.ceil(waitTime / 1000)}s before next action`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.actionTimestamps.push(now);
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  reset() {
    this.actionTimestamps = [];
  }
}

// Singleton instance
export const hnRateLimiter = new HNRateLimiter();
