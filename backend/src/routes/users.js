import express from 'express';
import {
  signup,
  login,
  getMe,
  updateMe,
  uploadProfileImage
} from '../controllers/userController.js';
import { auth } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// RESTful endpoints
router.post('/signup', signup);         // POST /api/users/signup
router.post('/login', login);           // POST /api/users/login
router.get('/me', auth, getMe);         // GET  /api/users/me
router.put('/me', auth, updateMe);      // PUT  /api/users/me
router.post('/me/upload', auth, upload.single('profileImage'), uploadProfileImage); // POST /api/users/me/upload

export default router;
