import { Router } from 'express';
import { searchController } from '../../controllers/search.controller';

const router = Router();

router.get('/search', (req, res, next) => searchController.search(req, res, next));

export default router;
