import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { createInvoice, listInvoices, getInvoice, exportInvoicesCsv, invoicePdf } from '../controllers/invoiceController.js';
import { body, query, validationResult } from 'express-validator';

const router = Router();

router.post('/',
  auth,
  body('companyName').isString().trim().notEmpty(),
  body('companyAddress').isString().trim().notEmpty(),
  body('companyGst').isString().trim().notEmpty(),
  body('ratePerTon').isNumeric(),
  body('trucks').isInt({ min: 0 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  createInvoice
);

router.get('/',
  auth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  listInvoices
);

router.get('/export/csv',
  auth,
  query('from').notEmpty(),
  query('to').notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  exportInvoicesCsv
);

router.get('/:id', auth, getInvoice);
router.get('/:id/pdf', auth, invoicePdf);

export default router;
