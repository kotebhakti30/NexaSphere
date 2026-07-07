import { Router } from 'express';
import { throttleMiddleware } from '../middleware/throttleMiddleware.js';
import settingsRouter from './settingsRoutes.js';
import rateLimitAdminRoutes from './rateLimitAdminRoutes.js';
import { auditLogController } from '../controllers/auditLogController.js';
import * as eventsController from '../controllers/eventsController.js';
import * as activityEventsController from '../controllers/activityEventsController.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import * as eventRegistrationController from '../controllers/eventRegistrationController.js';
import * as usersController from '../controllers/usersController.js';
import { usersRepository } from '../repositories/usersRepository.js';
import * as attendanceController from '../controllers/attendanceController.js';
import * as eventAnalyticsController from '../controllers/eventAnalyticsController.js';
import * as bannersController from '../controllers/bannersController.js';
import { adminAuditMiddleware, attachOldState } from '../middleware/adminAuditMiddleware.js';
import { eventsRepository } from '../repositories/eventsRepository.js';
import { authRateLimiter, protectedActionRateLimiter } from '../middleware/authRateLimiter.js';
import { eventRegistrationLimiter } from '../middleware/rateLimiter.js';
import { portfolioRepository } from '../repositories/portfolioRepository.js';
import { achievementsRepository } from '../repositories/achievementsRepository.js';
import { portfolioService } from '../services/portfolioService.js';
import { waitingRoomService } from '../services/waitingRoomService.js';
import { studentAuthService } from '../services/studentAuthService.js';
import { requireStudentAuth } from '../middleware/studentAuthMiddleware.js';
import * as sponsorshipsController from '../controllers/sponsorshipsController.js';
import * as subscriptionsController from '../controllers/subscriptionsController.js';
import * as portfolioAnalyticsController from '../controllers/portfolioAnalyticsController.js';
import { achievementSchema } from '../validators/portfolioSchemas.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import announcementPriorityRouter from './announcementPriority.js';
import eventConflictRouter from './eventConflict.js';
import waitlistRoutes from './waitlist.js';
import * as localAuthController from '../controllers/localAuthController.js';
import * as recommendationsController from '../controllers/recommendationsController.js';
import * as gamificationController from '../controllers/gamificationController.js';
import multer from 'multer';

// ⚠️ VERIFY THESE — best-guess paths based on naming conventions used elsewhere
// in this file. Uncomment once you've confirmed the real file locations, then
// delete this comment block.
// import { impersonationService } from '../services/impersonationService.js';
// import whiteboardController from '../controllers/whiteboardController.js';
// import * as followsController from '../controllers/followsController.js';
// import platformAnalyticsRoutes from './platformAnalytics.js';
// import recommendationEngine from '../services/recommendationEngine.js';

const router = Router();

router.use(rateLimitAdminRoutes);
router.use(throttleMiddleware);

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Public
router.get('/api/dashboard/leaderboard', gamificationController.getLeaderboard);
router.post(
  '/api/dashboard/xp',
  protectedActionRateLimiter,
  adminAuthMiddleware.requireAdmin,
  gamificationController.awardXP
);
router.post(
  '/api/assistant/recommend',
  upload.single('file'),
  recommendationsController.getProjectRecommendations
);
router.get('/api/users', usersController.getPublicUsers);
router.post('/api/whiteboard/export-pdf', whiteboardController.exportPDF);
router.get('/api/content/events', eventsController.listEvents);
router.get('/api/content/banners', bannersController.listActiveBanners);
router.post(
  '/api/content/events/:eventId/register',
  eventRegistrationLimiter,
  eventRegistrationController.registerForEvent
);
router.get('/api/content/events/:eventId/calendar', eventRegistrationController.getEventCalendar);
router.post(
  '/api/content/events/:eventId/cancel',
  eventRegistrationLimiter,
  requireStudentAuth,
  eventRegistrationController.cancelRegistration
);
router.get(
  '/api/content/events/:eventId/waitlist-position',
  eventRegistrationController.getWaitlistPosition
);
router.post(
  '/api/content/events/:eventId/waitlist/confirm',
  eventRegistrationController.confirmWaitlistSpot
);
router.delete(
  '/api/content/events/:eventId/waitlist',
  eventRegistrationLimiter,
  eventRegistrationController.leaveWaitlist
);
router.get(
  '/api/content/activity-events/:activityKey',
  activityEventsController.listActivityEvents
);
router.post(
  '/api/content/activity-events/:activityKey',
  protectedActionRateLimiter,
  adminAuthMiddleware.requireScope('events:write'),
  activityEventsController.addActivityEvent
);
router.delete(
  '/api/content/activity-events/:activityKey/:eventId',
  protectedActionRateLimiter,
  adminAuthMiddleware.requireScope('events:write'),
  activityEventsController.deleteActivityEvent
);
router.post('/account-recovery/request', authRateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  await studentAuthService.createRecoveryRequest(email);

  return res.json({
    success: true,
    message: 'If an account with that email exists, a recovery code has been sent.',
  });
});
router.post('/account-recovery/verify', authRateLimiter, async (req, res) => {
  const { email, enteredCode } = req.body;
  if (!email || !enteredCode) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const valid = await studentAuthService.verifyRecoveryCode(email, enteredCode);

  return res.json({
    success: valid,
  });
});

// Admin auth
router.post(
  '/api/attendance/mark',
  adminAuthMiddleware.requireAdmin,
  attendanceController.markAttendance
);
router.get(
  '/api/attendance',
  adminAuthMiddleware.requireAdmin,
  attendanceController.getAttendanceList
);
router.get('/api/admin/users', adminAuthMiddleware.requireAdmin, usersController.getAdminUsers);
router.post(
  '/api/admin/users',
  adminAuthMiddleware.requireAdmin,
  adminAuditMiddleware,
  usersController.adminCreateUser
);
router.put(
  '/api/admin/users/:id',
  adminAuthMiddleware.requireAdmin,
  attachOldState((req) => usersRepository.getUserById(req.params.id)),
  adminAuditMiddleware,
  usersController.adminUpdateUser
);
router.delete(
  '/api/admin/users/:id',
  adminAuthMiddleware.requireAdmin,
  adminAuditMiddleware,
  usersController.adminDeactivateUser
);
router.post('/api/admin/login', authRateLimiter, adminAuthMiddleware.login);

// Local User Auth
router.post('/api/auth/local/login', authRateLimiter, localAuthController.localLogin);

router.post('/api/admin/2fa/verify', authRateLimiter, adminAuthMiddleware.verifyTwoFactor);
router.post(
  '/api/admin/2fa/setup/verify',
  authRateLimiter,
  adminAuthMiddleware.verifyTwoFactorSetup
);
router.post('/api/admin/logout', adminAuthMiddleware.requireAdmin, adminAuthMiddleware.logout);
router.get(
  '/api/admin/security',
  adminAuthMiddleware.requireAdmin,
  adminAuthMiddleware.getSecurityOverview
);
router.delete(
  '/api/admin/security/sessions/:sessionId',
  adminAuthMiddleware.requireAdmin,
  adminAuthMiddleware.revokeSession
);
router.post(
  '/api/admin/security/sessions/logout-others',
  adminAuthMiddleware.requireAdmin,
  adminAuthMiddleware.logoutOtherSessions
);

// Audit Log Viewer APIs
router.get('/api/admin/audit-logs', adminAuthMiddleware.requireAdmin, auditLogController.listLogs);
router.get(
  '/api/admin/audit-logs/stats',
  adminAuthMiddleware.requireAdmin,
  auditLogController.getStats
);
router.get('/api/admin/audit-logs/export', adminAuthMiddleware.requireAdmin, async (req, res) => {
  const csv = await auditLogRepository.exportAuditLogsCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="admin-audit-logs.csv"');
  return res.send(csv);
});

router.get(
  '/api/admin/events',
  adminAuthMiddleware.requireScope('events:read'),
  eventsController.adminListEvents
);
router.get(
  '/api/admin/events/recommendations',
  adminAuthMiddleware.requireScope('events:read'),
  eventAnalyticsController.getEventRecommendations
);
router.get(
  '/api/admin/events/:eventId/analytics',
  adminAuthMiddleware.requireScope('events:read'),
  eventAnalyticsController.getEventStats
);
router.post(
  '/api/admin/events',
  adminAuthMiddleware.requireScope('events:write'),
  adminAuditMiddleware,
  eventsController.adminCreateEvent
);
router.put(
  '/api/admin/events/:id',
  adminAuthMiddleware.requireScope('events:write'),
  attachOldState((req) => eventsRepository.getById(req.params.id)),
  adminAuditMiddleware,
  eventsController.adminUpdateEvent
);
router.delete(
  '/api/admin/events/:id',
  adminAuthMiddleware.requireScope('events:write'),
  attachOldState((req) => eventsRepository.getById(req.params.id)),
  adminAuditMiddleware,
  eventsController.adminDeleteEvent
);

// Subscription management APIs
router.get(
  '/api/admin/subscriptions',
  adminAuthMiddleware.requireScope('events:read'),
  subscriptionsController.listSubscriptions
);
router.get(
  '/api/admin/subscriptions/stats',
  adminAuthMiddleware.requireScope('events:read'),
  subscriptionsController.getStats
);
router.post(
  '/api/admin/subscriptions',
  adminAuthMiddleware.requireScope('events:write'),
  adminAuditMiddleware,
  subscriptionsController.createSubscription
);

// Banners Admin
router.get(
  '/api/admin/banners',
  adminAuthMiddleware.requireAdmin,
  bannersController.listAllBanners
);
router.post('/api/admin/banners', adminAuthMiddleware.requireAdmin, bannersController.createBanner);
router.put(
  '/api/admin/banners/:id',
  adminAuthMiddleware.requireAdmin,
  bannersController.updateBanner
);
router.delete(
  '/api/admin/banners/:id',
  adminAuthMiddleware.requireAdmin,
  bannersController.deleteBanner
);

router.post(
  '/api/admin/subscriptions/:userId/cancel',
  adminAuthMiddleware.requireScope('events:write'),
  adminAuditMiddleware,
  subscriptionsController.cancelSubscription
);
router.get(
  '/api/admin/subscriptions/:userId/billing',
  adminAuthMiddleware.requireScope('events:read'),
  subscriptionsController.getBillingHistory
);

// Portfolio management APIs
router.get(
  '/api/admin/portfolios',
  adminAuthMiddleware.requireScope('events:read'),
  async (req, res) => {
    try {
      const username = String(req.query.username || '').trim();
      if (username) {
        const portfolio = await portfolioService.getByUsername(username);
        return res.json(portfolio ? { portfolios: [portfolio] } : { portfolios: [] });
      }
      const portfolios = (await portfolioRepository.listAll)
        ? await portfolioRepository.listAll()
        : [];
      return res.json({ portfolios });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);
router.delete(
  '/api/admin/portfolios/:username',
  adminAuthMiddleware.requireScope('events:write'),
  adminAuditMiddleware,
  async (req, res) => {
    try {
      const username = String(req.params.username || '')
        .trim()
        .toLowerCase();
      if (!username) return res.status(400).json({ error: 'Username required' });
      await portfolioRepository.delete(username);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Portfolio Analytics APIs
router.get(
  '/api/portfolio/:username/analytics',
  portfolioAnalyticsController.getPortfolioAnalytics
);
router.post('/api/portfolio/:username/visit', portfolioAnalyticsController.recordPortfolioVisit);
router.get(
  '/api/portfolio/:username/monthly-report',
  portfolioAnalyticsController.getMonthlyReport
);

// Achievement management APIs
router.get(
  '/api/admin/portfolios/:username/achievements',
  adminAuthMiddleware.requireScope('events:read'),
  async (req, res) => {
    try {
      const username = String(req.params.username || '')
        .trim()
        .toLowerCase();
      const achievements = await achievementsRepository.getByUsername(username);
      return res.json({ achievements });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);
router.post(
  '/api/admin/portfolios/:username/achievements',
  adminAuthMiddleware.requireScope('events:write'),
  adminAuditMiddleware,
  async (req, res) => {
    try {
      const username = String(req.params.username || '')
        .trim()
        .toLowerCase();
      const validated = achievementSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ error: validated.error.errors[0].message });
      }

      const achievement = await portfolioService.awardAchievement(username, validated.data);
      return res.status(201).json({ achievement });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);
router.delete(
  '/api/admin/portfolios/:username/achievements/:name',
  adminAuthMiddleware.requireScope('events:write'),
  attachOldState(async (req) => {
    const username = String(req.params.username || '')
      .trim()
      .toLowerCase();
    const achievements = await achievementsRepository.getByUsername(username);
    const targetName = String(req.params.name || '').trim();
    return achievements.find((a) => a.name === targetName);
  }),
  adminAuditMiddleware,
  async (req, res) => {
    try {
      const username = String(req.params.username || '')
        .trim()
        .toLowerCase();
      const name = String(req.params.name || '').trim();
      await portfolioService.removeAchievement(username, name);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Waiting room management API
router.get(
  '/api/admin/events/:eventId/waiting-room',
  adminAuthMiddleware.requireScope('events:read'),
  async (req, res) => {
    try {
      const eventId = String(req.params.eventId || '').trim();
      const queue = waitingRoomService.getQueue(eventId);
      return res.json({ queue, total: queue.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

router.use('/api/admin/settings', adminAuthMiddleware.requireAdmin, settingsRouter);

router.post('/api/admin/impersonate/stop', adminAuthMiddleware.requireAdmin, (req, res) => {
  impersonationService.stop(req.adminSession.token);
  return res.json({ impersonating: false });
});
router.get('/api/admin/impersonate/status', adminAuthMiddleware.requireAdmin, (req, res) => {
  const active = impersonationService.getActive(req.adminSession.token);
  return res.json({ impersonating: !!active, user: active?.targetUser || null });
});

router.use('/api/announcements', announcementPriorityRouter);
router.use('/api/events', eventConflictRouter);
router.use('/api/admin/waitlist', waitlistRoutes);
router.use('/recommendations', recommendationEngine);

// Follows/User Following System APIs
// Follow/Unfollow operations
router.post(
  '/api/student/follows/:followingId',
  requireStudentAuth,
  protectedActionRateLimiter,
  followsController.followUser
);
router.delete(
  '/api/student/follows/:followingId',
  requireStudentAuth,
  protectedActionRateLimiter,
  followsController.unfollowUser
);

// Check follow status
router.get(
  '/api/student/follows/status/:followingId',
  requireStudentAuth,
  followsController.checkFollowStatus
);

// Get followers and following lists
router.get('/api/student/users/:userId/followers', followsController.getUserFollowers);
router.get('/api/student/users/:userId/following', followsController.getUserFollowing);

// Get follow counts
router.get('/api/student/users/:userId/follow-counts', followsController.getFollowCounts);

// Current user endpoints
router.get(
  '/api/student/me/followers',
  requireStudentAuth,
  followsController.getCurrentUserFollowers
);
router.get(
  '/api/student/me/following',
  requireStudentAuth,
  followsController.getCurrentUserFollowing
);
router.get(
  '/api/student/me/follow-counts',
  requireStudentAuth,
  followsController.getCurrentUserFollowCounts
);

// Activity feed from followed users
router.get(
  '/api/student/activity-feed/followed',
  requireStudentAuth,
  followsController.getFollowedUsersActivityFeed
);

// Platform Analytics APIs
router.use('/api/analytics', platformAnalyticsRoutes);

export default router;
