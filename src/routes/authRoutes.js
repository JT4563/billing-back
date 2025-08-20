import { Router } from 'express';
import { signIn } from '../controllers/authController.js';
import { body, validationResult } from 'express-validator';

const router = Router();

router.post('/sign-in',
  body('accessCode').isString().trim().notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  signIn
);

export default router;
