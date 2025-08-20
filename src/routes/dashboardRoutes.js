import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { summary, daily } from '../controllers/dashboardController.js';

const router = Router();
router.get('/summary', auth, summary);
router.get('/daily', auth, daily);

export default router;
