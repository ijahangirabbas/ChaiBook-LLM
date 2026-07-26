import { Router } from 'express';
import { userController } from '../../controllers/user.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticateUser);

router.get('/me', (req, res, next) => userController.getProfile(req, res, next));
router.get('/me/settings', (req, res, next) => userController.getSettings(req, res, next));
router.patch('/me/settings', (req, res, next) => userController.updateSettings(req, res, next));
router.post('/me/export', (req, res, next) => userController.exportAccountData(req, res, next));
router.delete('/me', (req, res, next) => userController.deleteAccount(req, res, next));

export default router;
