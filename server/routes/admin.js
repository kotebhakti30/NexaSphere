/**
 * Admin Dashboard Routes
 * Provides admin-only endpoints for membership data and session info.
 */

import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';
import { CircuitBreaker, circuitBreakerRegistry } from '../utils/circuitBreaker.js';

const router = Router();
const adminAuth = [apiRateLimiter, adminAuthMiddleware.requireAdmin];

/**
 * Raw membership fetch helper, wrapped in a circuit breaker to protect
 * against repeated failures from the upstream Google Apps Script endpoint.
 */
async function _rawMembershipFetch(scriptUrl, secret) {
  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getResponses', token: secret }),
  });
  if (!response.ok) {
    throw new Error(`Google Apps Script returned ${response.status}`);
  }
  return response.json();
}

const membershipBreaker = circuitBreakerRegistry.register(
  'membership-gas',
  new CircuitBreaker(_rawMembershipFetch, {
    name: 'membership-gas',
    failureThreshold: 3,
    successThreshold: 2,
    coolDownPeriod: 15000,
    maxCoolDownPeriod: 120000,
  })
);

/**
 * GET /membership — Fetch membership responses from Google Apps Script,
 * protected by a circuit breaker. Returns an empty list if the script URL
 * or secret is not configured, or if the circuit is open.
 */
router.get('/membership', adminAuth, async (req, res) => {
  const scriptUrl = process.env.MEMBERSHIP_SCRIPT_URL;
  const secret = process.env.MEMBERSHIP_SECRET;

  if (!scriptUrl || !secret) {
    return res.json({ responses: [] });
  }

  try {
    const data = await membershipBreaker.execute(scriptUrl, secret);
    return res.json({ responses: data.responses || [] });
  } catch (err) {
    if (err.code === 'CIRCUIT_OPEN') {
      console.warn('[Membership] Circuit breaker is OPEN, returning empty responses');
      return res.json({ responses: [] });
    }
    console.error('[Membership] Failed to fetch responses:', err.message);
    return res.status(500).json({ error: 'Failed to fetch membership responses' });
  }
});

/**
 * GET /me — Returns the authenticated admin's username.
 */
router.get('/me', adminAuth, (req, res) => {
  return res.json({ username: req.adminSession.username });
});

export default router;
