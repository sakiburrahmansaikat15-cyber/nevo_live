import { Router } from 'express';
import { streamController } from '../controllers/stream.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireVerified } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { createStreamSchema } from '@bogolive/shared';

const router = Router();

router.get('/feed', optionalAuth, streamController.getFeed);
router.get('/my-active', authenticate, streamController.getMyActiveStream);
// Country chips for the filter bar (must stay above /:id)
router.get('/countries', streamController.getCountries);
router.get('/', streamController.getFeed);
router.post('/', authenticate, requireVerified, validate(createStreamSchema), streamController.createStream);
router.get('/:id', streamController.getStream);
router.post('/:id/join', authenticate, streamController.joinStream);
router.post('/:id/leave', authenticate, streamController.leaveStream);
router.post('/:id/heartbeat', authenticate, streamController.heartbeat);
router.post('/:id/end', authenticate, streamController.endStream);

export default router;
