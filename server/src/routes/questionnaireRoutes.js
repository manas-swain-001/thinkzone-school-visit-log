import { Router } from 'express';
import * as controller from '../controllers/questionnaireController.js';

const router = Router();

// No query validation needed: the month comes from the server clock, not the
// client, so there is nothing for the caller to get wrong.
router.get('/current', controller.getCurrentQuestionnaire);

export default router;
