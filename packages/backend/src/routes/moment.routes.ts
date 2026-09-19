import { Router } from 'express';
import { momentController } from '../controllers/moment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', momentController.getFeed);
router.post('/', authenticate, momentController.createMoment);
router.get('/:id', momentController.getMoment);
router.delete('/:id', authenticate, momentController.deleteMoment);
router.post('/:id/like', authenticate, momentController.toggleLike);
router.post('/:id/comment', authenticate, momentController.addComment);

export default router;
