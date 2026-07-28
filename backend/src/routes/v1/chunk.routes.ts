import { Router } from 'express';
import { chunkController } from '../../controllers/chunk.controller';

const router = Router();

router.get('/chunks/:chunkId', (req, res, next) => chunkController.getChunk(req, res, next));

export default router;
