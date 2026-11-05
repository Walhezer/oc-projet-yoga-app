import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { SessionController } from '../controllers/session.controller';
import { TeacherController } from '../controllers/teacher.controller';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Controllers
const authController = new AuthController();
const sessionController = new SessionController();
const teacherController = new TeacherController();
const userController = new UserController();

// Auth routes (public)
router.post('/api/auth/login', (req, res) => authController.login(req, res));
router.post('/api/auth/register', (req, res) => authController.register(req, res));

// Session routes (protected) - Passage direct par référence
router.get('/api/session', authMiddleware, sessionController.getAll);
router.get('/api/session/:id', authMiddleware, sessionController.getById);
router.post('/api/session', authMiddleware, sessionController.create);
router.put('/api/session/:id', authMiddleware, sessionController.update);
router.delete('/api/session/:id', authMiddleware, sessionController.delete);
router.post('/api/session/:id/participate/:userId', authMiddleware, sessionController.participate);
router.delete('/api/session/:id/participate/:userId', authMiddleware, sessionController.unparticipate);

// Teacher routes (protected)
router.get('/api/teacher', authMiddleware, teacherController.getAll);
router.get('/api/teacher/:id', authMiddleware, teacherController.getById);

// User routes (protected)
router.get('/api/user/:id', authMiddleware, userController.getById);
router.post('/api/user/promote-admin', authMiddleware, userController.promoteSelfToAdmin);
router.delete('/api/user/:id', authMiddleware, userController.delete);

export default router;