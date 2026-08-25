const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { requireGuest, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Validation Rules for Freelancer Registration
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Full Name must be at least 2 characters long'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Confirm password does not match password');
      }
      return true;
    }),
  body('branch')
    .trim()
    .notEmpty()
    .withMessage('Please select or specify your engineering branch'),
  body('year')
    .isInt({ min: 1, max: 5 })
    .withMessage('Academic Year must be a valid number between 1 and 5'),
  body('phone')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit mobile number')
];

// Validation Rules for Login
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Authentication Routes
router.get('/login', requireGuest, authController.showLogin);
router.post('/login', requireGuest, loginValidation, authController.login);

router.get('/register', requireGuest, authController.showRegister);
router.post('/register', requireGuest, registerValidation, authController.register);

router.post('/logout', authController.logout);

// Current User State Endpoint
router.get('/auth/me', authController.getCurrentUser);

// Account Status Routes
router.get('/account/pending', authController.showPending);
router.get('/account/suspended', authController.showSuspended);
router.get('/account/rejected', authController.showRejected);

module.exports = router;
