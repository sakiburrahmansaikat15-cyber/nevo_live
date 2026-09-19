import { Router } from 'express';
import { roomController } from '../controllers/room.controller';
import { authenticate } from '../middleware/auth';
import { requireVerified } from '../middleware/roleGuard';

const router = Router();

router.get('/', roomController.listRooms);
router.post('/', authenticate, requireVerified, roomController.createRoom);
router.get('/:id', roomController.getRoom);
router.post('/:id/join', authenticate, roomController.joinRoom);
router.post('/:id/leave', authenticate, roomController.leaveRoom);
router.post('/:id/seats/:index/sit', authenticate, roomController.sit);
router.post('/:id/seats/:index/stand', authenticate, roomController.stand);

export default router;
