import { Router } from 'express';
import { syncController } from '../controllers/syncController.js';
import { requireStudentAuth } from '../middleware/studentAuthMiddleware.js';
<<<<<<< HEAD

const router = Router();

router.get('/api/sync/status', syncController.getSyncStatus);
router.get('/api/sync/updates', syncController.getUpdates);
router.post('/api/sync/batch', requireStudentAuth, syncController.syncBatch);
=======
import { syncRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/api/sync/status', requireStudentAuth, syncController.getSyncStatus);
router.get('/api/sync/updates', requireStudentAuth, syncController.getUpdates);
router.post('/api/sync/batch', requireStudentAuth, syncRateLimiter, syncController.syncBatch);
>>>>>>> pr-resolve-1977

export default router;
