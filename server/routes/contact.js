const express = require('express');
const { body, validationResult } = require('express-validator');
const Pet = require('../models/Pet');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Contact pet owner
router.post('/pet/:petId', auth, [
  body('message').trim().isLength({ min: 10, max: 500 }).withMessage('Message must be between 10 and 500 characters'),
  body('subject').optional().trim().isLength({ max: 100 }).withMessage('Subject must be less than 100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, subject } = req.body;
    const petId = req.params.petId;

    // Get pet and owner information
    const pet = await Pet.findById(petId).populate('owner', 'name email phone');
    
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // Get current user
    const currentUser = await User.findById(req.user.userId);

    // Check if user is trying to contact themselves
    if (pet.owner._id.toString() === req.user.userId) {
      return res.status(400).json({ message: 'You cannot contact yourself' });
    }

    // In a real application, you would send an email here
    // For now, we'll just return a success message
    const contactInfo = {
      petName: pet.name,
      petId: pet._id,
      ownerName: pet.owner.name,
      ownerEmail: pet.owner.email,
      ownerPhone: pet.owner.phone,
      fromUser: currentUser.name,
      fromEmail: currentUser.email,
      message,
      subject: subject || `Inquiry about ${pet.name}`,
      timestamp: new Date()
    };

    // Here you would typically send an email using nodemailer
    // For demo purposes, we'll just log the contact info
    console.log('Contact request:', contactInfo);

    res.json({
      message: 'Contact request sent successfully!',
      contactInfo
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contact history for current user
router.get('/history', auth, async (req, res) => {
  try {
    // In a real application, you would store contact history in the database
    // For now, we'll return an empty array
    res.json([]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;