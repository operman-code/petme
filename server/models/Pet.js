const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  species: {
    type: String,
    required: true,
    enum: ['dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'guinea-pig', 'other']
  },
  breed: {
    type: String,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 0
  },
  ageUnit: {
    type: String,
    enum: ['days', 'weeks', 'months', 'years'],
    default: 'months'
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'unknown'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  images: [{
    type: String,
    required: true
  }],
  location: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isVaccinated: {
    type: Boolean,
    default: false
  },
  isNeutered: {
    type: Boolean,
    default: false
  },
  healthStatus: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'needs-care'],
    default: 'good'
  },
  temperament: {
    type: String,
    enum: ['friendly', 'shy', 'energetic', 'calm', 'playful', 'independent'],
    default: 'friendly'
  },
  tags: [{
    type: String,
    trim: true
  }],
  views: {
    type: Number,
    default: 0
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Index for search functionality
petSchema.index({ name: 'text', description: 'text', breed: 'text' });

module.exports = mongoose.model('Pet', petSchema);