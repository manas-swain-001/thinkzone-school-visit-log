import { Router } from 'express';
import validate from '../middleware/validate.js';
import * as controller from '../controllers/visitController.js';
import { createVisitBody, listVisitsQuery } from './visitSchemas.js';

const router = Router();

router.post('/', validate(createVisitBody, 'body'), controller.createVisit);
router.get('/', validate(listVisitsQuery, 'query'), controller.listVisits);

export default router;
