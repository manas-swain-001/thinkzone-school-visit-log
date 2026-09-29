import { Router } from 'express';
import validate from '../middleware/validate.js';
import * as controller from '../controllers/schoolController.js';
import { listSchoolsQuery } from './schoolSchemas.js';

const router = Router();

router.get('/', validate(listSchoolsQuery, 'query'), controller.listSchools);

export default router;
