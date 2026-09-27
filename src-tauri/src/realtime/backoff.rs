// src-tauri/src/realtime/backoff.rs
//
//! Reconnect backoff for the realtime WebSocket client.
//!
//! WHY THIS IS LOAD-BEARING
//! ------------------------
//! The server uses the STANDARD (non-hibernating) Durable Object WebSocket
//! API. Cloudflare evicts an idle Durable Object from memory, which DROPS its
//! WebSocket connections — the connections do not survive eviction the way
//! they do with the hibernation API. This is a deliberate, owner-approved
//! trade-off (it avoids burning ~324,000 GB-s/month of duration budget on an
//! idle object).
//!
//! The consequence is that the CLIENT is responsible for staying connected.
//! If reconnect is broken, notifications stop silently — there is no error
//! surface, the socket just never comes back. So the backoff policy is
//! covered by unit tests rather than left to manual observation.

use std::time::Duration;

/// Backoff policy for reconnect attempts.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Backoff {
    /// Delay before the first retry.
    pub initial: Duration,
    /// Upper bound on any single delay.
    pub max: Duration,
    /// Multiplier applied per consecutive failure.
    pub factor: u32,
    /// Additive jitter in milliseconds, applied as `delay + rand(0..jitter)`.
    ///
    /// Jitter matters even for a single-user desktop app: without it, every
    /// client that was connected when the hub was evicted reconnects at the
    /// same instant, producing a thundering herd against the Durable Object.
    pub jitter_ms: u64,
}

impl Default for Backoff {
    fn default() -> Self {
        Self {
            initial: Duration::from_secs(1),
            max: Duration::from_secs(60),
            factor: 2,
            jitter_ms: 1000,
        }
    }
}

impl Backoff {
    /// Compute the delay for the given attempt number (0-based).
    ///
    /// `attempt` is the count of CONSECUTIVE failures. A successful
    /// connection resets it to 0.
    pub fn delay_for(&self, attempt: u32) -> Duration {
        // Saturating: a long outage must not overflow into a tiny delay.
        let factor = self.factor.max(1) as u64;
        let exponent = attempt.min(32);

        let base_ms = self.initial.as_millis() as u64;
        let max_ms = self.max.as_millis() as u64;

        // checked_pow would be ideal, but saturation to `max` is equivalent
        // here and avoids a Result in a hot path.
        let scaled = base_ms.saturating_mul(factor.saturating_pow(exponent));

        Duration::from_millis(scaled.min(max_ms))
    }

    /// Compute the delay for `attempt`, adding up to `jitter_ms` of randomness.
    ///
    /// `jitter_seed` is supplied by the caller (rather than read from a global
    /// RNG) so the function stays deterministic and testable.
    pub fn delay_with_jitter(&self, attempt: u32, jitter_seed: u64) -> Duration {
        let base = self.delay_for(attempt);

        if self.jitter_ms == 0 {
            return base;
        }

        let extra = jitter_seed % (self.jitter_ms + 1);

        // Clamp AFTER adding jitter, so jitter cannot push past the ceiling.
        (base + Duration::from_millis(extra)).min(self.max + Duration::from_millis(self.jitter_ms))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_first_attempt_uses_initial_delay() {
        let b = Backoff::default();
        assert_eq!(b.delay_for(0), Duration::from_secs(1));
    }

    #[test]
    fn test_delay_doubles_per_attempt() {
        let b = Backoff::default();
        assert_eq!(b.delay_for(0), Duration::from_secs(1));
        assert_eq!(b.delay_for(1), Duration::from_secs(2));
        assert_eq!(b.delay_for(2), Duration::from_secs(4));
        assert_eq!(b.delay_for(3), Duration::from_secs(8));
        assert_eq!(b.delay_for(4), Duration::from_secs(16));
        assert_eq!(b.delay_for(5), Duration::from_secs(32));
    }

    #[test]
    fn test_delay_is_capped_at_max() {
        let b = Backoff::default();
        // 2^6 = 64s > 60s cap.
        assert_eq!(b.delay_for(6), Duration::from_secs(60));
        assert_eq!(b.delay_for(50), Duration::from_secs(60));
    }

    #[test]
    fn test_extreme_attempt_does_not_overflow_or_wrap() {
        // A very long outage must not saturate into a near-zero delay, which
        // would turn a persistent failure into a hot retry loop.
        let b = Backoff::default();
        assert_eq!(b.delay_for(u32::MAX), Duration::from_secs(60));
    }

    #[test]
    fn test_delay_is_monotonic_non_decreasing() {
        let b = Backoff::default();
        let mut prev = Duration::ZERO;

        for attempt in 0..20 {
            let d = b.delay_for(attempt);
            assert!(d >= prev, "delay decreased at attempt {attempt}");
            prev = d;
        }
    }

    #[test]
    fn test_jitter_stays_within_bounds() {
        let b = Backoff::default();

        for seed in 0..200u64 {
            let d = b.delay_with_jitter(0, seed);
            assert!(d >= Duration::from_secs(1), "jitter underflowed the base");
            assert!(
                d <= Duration::from_secs(2),
                "jitter exceeded base + jitter_ms"
            );
        }
    }

    #[test]
    fn test_jitter_is_deterministic_for_a_seed() {
        let b = Backoff::default();
        assert_eq!(b.delay_with_jitter(3, 12345), b.delay_with_jitter(3, 12345));
    }

    #[test]
    fn test_jitter_actually_varies() {
        // If jitter never varied, the thundering-herd protection is a no-op.
        let b = Backoff::default();
        let a = b.delay_with_jitter(0, 0);
        let c = b.delay_with_jitter(0, 500);
        assert_ne!(a, c, "jitter produced identical delays for different seeds");
    }

    #[test]
    fn test_zero_jitter_is_a_pure_exponential() {
        let b = Backoff {
            jitter_ms: 0,
            ..Backoff::default()
        };
        assert_eq!(b.delay_with_jitter(2, 999), Duration::from_secs(4));
    }

    #[test]
    fn test_zero_factor_does_not_divide_or_stall() {
        // factor is clamped to >= 1, so the delay stays at `initial` rather
        // than collapsing to zero (which would be a hot loop).
        let b = Backoff {
            factor: 0,
            jitter_ms: 0,
            ..Backoff::default()
        };
        assert_eq!(b.delay_for(0), Duration::from_secs(1));
        assert_eq!(b.delay_for(5), Duration::from_secs(1));
    }
}
