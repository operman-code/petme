import express from 'express';
import cors from 'cors';
import path from 'path';
import usersRoutes from './routes/users.js';

const app = express();
app.use(cors());
app.use(express.json());

// serve uploaded images
app.use('/profile_images', express.static(path.join(process.cwd(), 'uploads/profile_images')));

// routes
app.use('/api/users', usersRoutes);

export default app;
