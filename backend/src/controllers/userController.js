import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';

export const signup = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const conn = await pool.getConnection();
    const [exists] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) { conn.release(); return res.status(400).json({ error: 'Email already registered' }); }

    const hashed = await bcrypt.hash(password, 10);
    await conn.query('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)', [full_name, email, hashed]);
    conn.release();

    return res.json({ success: true, message: 'Signup successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT id, full_name, email, password_hash, profile_image FROM users WHERE email = ?', [email]);
    conn.release();

    if (rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({ success: true, token, user: { id: user.id, full_name: user.full_name, email: user.email, profile_image: user.profile_image } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const getMe = async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT id, full_name, email, profile_image, created_at FROM users WHERE id = ?', [req.user.id]);
    conn.release();
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateMe = async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const conn = await pool.getConnection();
    await conn.query('UPDATE users SET full_name = ?, email = ? WHERE id = ?', [full_name, email, req.user.id]);
    conn.release();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const filename = req.file.filename;

    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT profile_image FROM users WHERE id = ?', [req.user.id]);
    const old = rows[0] && rows[0].profile_image;

    await conn.query('UPDATE users SET profile_image = ? WHERE id = ?', [filename, req.user.id]);
    conn.release();

    // delete old image if present
    if (old) {
      const oldPath = path.join(process.cwd(), 'uploads/profile_images', old);
      try { await fs.unlink(oldPath); } catch (e) { /* ignore not found */ }
    }

    return res.json({ success: true, filename, url: `${process.env.PUBLIC_URL || ''}/profile_images/${filename}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
