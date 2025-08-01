const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Pet = require('../models/Pet');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all pets with filters
router.get('/', async (req, res) => {
  try {
    const {
      species,
      minPrice,
      maxPrice,
      location,
      search,
      page = 1,
      limit = 12
    } = req.query;

    const filter = { isAvailable: true };

    if (species) filter.species = species;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    
    const pets = await Pet.find(filter)
      .populate('owner', 'name location phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Pet.countDocuments(filter);

    res.json({
      pets,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single pet
router.get('/:id', async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id)
      .populate('owner', 'name location phone email bio');

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // Increment views
    pet.views += 1;
    await pet.save();

    res.json(pet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new pet listing
router.post('/', auth, upload.array('images', 5), [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('species').isIn(['dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'guinea-pig', 'other']).withMessage('Invalid species'),
  body('age').isNumeric().withMessage('Age must be a number'),
  body('gender').isIn(['male', 'female', 'unknown']).withMessage('Invalid gender'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('location').trim().isLength({ min: 1 }).withMessage('Location is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);

    const pet = new Pet({
      ...req.body,
      images: imageUrls,
      owner: req.user.userId
    });

    await pet.save();

    const populatedPet = await Pet.findById(pet._id)
      .populate('owner', 'name location phone');

    res.status(201).json(populatedPet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update pet listing
router.put('/:id', auth, upload.array('images', 5), async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // Check if user owns the pet
    if (pet.owner.toString() !== req.user.userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updateData = { ...req.body };

    // Handle new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImageUrls = req.files.map(file => `/uploads/${file.filename}`);
      updateData.images = newImageUrls;
    }

    const updatedPet = await Pet.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('owner', 'name location phone');

    res.json(updatedPet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete pet listing
router.delete('/:id', auth, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // Check if user owns the pet
    if (pet.owner.toString() !== req.user.userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Pet.findByIdAndDelete(req.params.id);

    res.json({ message: 'Pet listing removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle favorite
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    const userId = req.user.userId;
    const isFavorited = pet.favorites.includes(userId);

    if (isFavorited) {
      pet.favorites = pet.favorites.filter(id => id.toString() !== userId);
    } else {
      pet.favorites.push(userId);
    }

    await pet.save();

    res.json({ isFavorited: !isFavorited });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's pets
router.get('/user/me', auth, async (req, res) => {
  try {
    const pets = await Pet.find({ owner: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(pets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's favorites
router.get('/user/favorites', auth, async (req, res) => {
  try {
    const pets = await Pet.find({ favorites: req.user.userId })
      .populate('owner', 'name location phone')
      .sort({ createdAt: -1 });

    res.json(pets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;