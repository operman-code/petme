const express = require('express');
const User = require('../models/User');
const Pet = require('../models/Pet');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's pets
    const pets = await Pet.find({ owner: req.params.id, isAvailable: true })
      .sort({ createdAt: -1 })
      .limit(6);

    res.json({ user, pets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user's profile
router.get('/profile/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;