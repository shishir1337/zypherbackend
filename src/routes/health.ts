import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types';

const router: Router = Router();

router.get('/', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'Server is running',
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    },
  };

  res.json(response);
});

export default router;
