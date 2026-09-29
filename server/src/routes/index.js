import { Router } from 'express';
import schoolRoutes from './schoolRoutes.js';
import questionnaireRoutes from './questionnaireRoutes.js';
import visitRoutes from './visitRoutes.js';
import reportRoutes from './reportRoutes.js';

const router = Router();

router.use('/schools', schoolRoutes);
router.use('/questionnaires', questionnaireRoutes);
router.use('/visits', visitRoutes);
router.use('/reports', reportRoutes);

export default router;
