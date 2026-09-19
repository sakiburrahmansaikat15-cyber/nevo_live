import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', chatController.getChats);
router.get('/unread-count', chatController.getUnreadCount);
router.post('/', chatController.getOrCreateChat);
router.post('/:chatId/read', chatController.markChatRead);
router.get('/:chatId/messages', chatController.getMessages);
router.post('/:chatId/messages', chatController.sendMessage);

export default router;
