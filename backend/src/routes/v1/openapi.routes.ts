import { Router, Request, Response } from 'express';
import { buildOpenApiSpec } from '../../openapi/spec';

const router = Router();

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.status(200).json(buildOpenApiSpec());
});

export default router;
