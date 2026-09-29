import { Router } from 'express';
import validate from '../middleware/validate.js';
import * as controller from '../controllers/reportController.js';
import { blockSummaryQuery } from './reportSchemas.js';

const router = Router();

router.get('/block-summary', validate(blockSummaryQuery, 'query'), controller.blockSummary);

export default router;
