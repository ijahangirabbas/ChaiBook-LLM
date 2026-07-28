import { Router } from 'express';
import { chunkController } from '../../controllers/chunk.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/chunks/:chunkId', authenticateUser, (req, res, next) =>
  chunkController.getChunk(req, res, next)
);

export default router;
