const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');

/**
 * Render Login Page
 * GET /login
 */
const showLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login | PHOENIX - MBM University',
    activePage: 'login',
    formData: {},
    errors: {}
  });
};

/**
 * Process Login Form Submission
 * POST /login
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  const { email, password } = req.body;

  if (!errors.isEmpty()) {
    const errorMap = errors.mapped();
    return res.status(422).render('auth/login', {
      title: 'Login | PHOENIX - MBM University',
      activePage: 'login',
      formData: { email },
      errors: errorMap
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      req.flash('error_msg', 'Invalid email or password.');
      return res.status(401).render('auth/login', {
        title: 'Login | PHOENIX - MBM University',
        activePage: 'login',
        formData: { email },
        errors: { general: { msg: 'Invalid email or password.' } }
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      req.flash('error_msg', 'Invalid email or password.');
      return res.status(401).render('auth/login', {
        title: 'Login | PHOENIX - MBM University',
        activePage: 'login',
        formData: { email },
        errors: { general: { msg: 'Invalid email or password.' } }
      });
    }

    // Check account status
    if (user.status === 'PENDING') {
      req.flash('info_msg', 'Your registration has been submitted and is pending administrator review.');
      return res.redirect('/account/pending');
    }

    if (user.status === 'SUSPENDED') {
      return res.redirect('/account/suspended');
    }

    if (user.status === 'REJECTED') {
      return res.redirect('/account/rejected');
    }

    // Account is ACTIVE: Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('[Session Regenerate Error]:', err);
        req.flash('error_msg', 'Login session could not be established. Please try again.');
        return res.redirect('/login');
      }

      // Store only minimal identifier in session
      req.session.userId = user._id;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[Session Save Error]:', saveErr);
          req.flash('error_msg', 'Failed to save session. Please try again.');
          return res.redirect('/login');
        }

        req.flash('success_msg', `Welcome back, ${user.name}!`);

        // Redirect strictly based on database role
        if (user.role === 'ADMIN') {
          return res.redirect('/admin/dashboard');
        } else if (user.role === 'CLIENT') {
          return res.redirect('/client/dashboard');
        } else {
          return res.redirect('/freelancer/dashboard');
        }
      });
    });
  } catch (error) {
    console.error('[Login Controller Error]:', error);
    req.flash('error_msg', 'An unexpected error occurred during login. Please try again.');
    res.status(500).redirect('/login');
  }
};

/**
 * Render Freelancer Registration Page
 * GET /register
 */
const showRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Freelancer Registration | PHOENIX - MBM University',
    activePage: 'register',
    formData: {},
    errors: {}
  });
};

/**
 * Process Freelancer Registration Submission
 * POST /register
 */
const register = async (req, res) => {
  const errors = validationResult(req);
  const { name, email, password, confirmPassword, enrollmentNumber, branch, year, phone } = req.body;

  // Preserve non-sensitive form data for repopulation
  const formData = {
    name: name || '',
    email: email || '',
    enrollmentNumber: enrollmentNumber || '',
    branch: branch || '',
    year: year || '',
    phone: phone || ''
  };

  if (!errors.isEmpty()) {
    const errorMap = errors.mapped();
    return res.status(422).render('auth/register', {
      title: 'Freelancer Registration | PHOENIX - MBM University',
      activePage: 'register',
      formData,
      errors: errorMap
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedEnrollment = enrollmentNumber ? enrollmentNumber.trim() : '';

  try {
    // 1. Check duplicate email
    const existingEmailUser = await User.findOne({ email: normalizedEmail });
    if (existingEmailUser) {
      return res.status(409).render('auth/register', {
        title: 'Freelancer Registration | PHOENIX - MBM University',
        activePage: 'register',
        formData,
        errors: {
          email: { msg: 'This email is already registered.' }
        }
      });
    }

    // 2. Check duplicate enrollment number if provided
    if (trimmedEnrollment) {
      const existingEnrollmentProfile = await FreelancerProfile.findOne({ enrollmentNumber: trimmedEnrollment });
      if (existingEnrollmentProfile) {
        return res.status(409).render('auth/register', {
          title: 'Freelancer Registration | PHOENIX - MBM University',
          activePage: 'register',
          formData,
          errors: {
            enrollmentNumber: { msg: 'This enrollment number is already registered.' }
          }
        });
      }
    }

    // 3. Hash password securely
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Create User and FreelancerProfile atomically
    let createdUser = null;
    let mongoSession = null;

    try {
      // Attempt transaction if MongoDB replica set is available
      mongoSession = await mongoose.startSession();
      mongoSession.startTransaction();

      const [user] = await User.create(
        [
          {
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role: 'FREELANCER',
            status: 'PENDING'
          }
        ],
        { session: mongoSession }
      );

      createdUser = user;

      await FreelancerProfile.create(
        [
          {
            userId: user._id,
            enrollmentNumber: trimmedEnrollment,
            branch: branch.trim(),
            year: Number(year),
            phone: phone.trim()
          }
        ],
        { session: mongoSession }
      );

      await mongoSession.commitTransaction();
      mongoSession.endSession();
    } catch (txError) {
      if (mongoSession) {
        try {
          await mongoSession.abortTransaction();
          mongoSession.endSession();
        } catch (_) {}
      }

      // Standalone MongoDB fallback cleanup (if transactions unsupported on standalone instances)
      console.warn('[Registration Tx Notice] Transaction unavailable or failed; executing fallback creation:', txError.message);
      
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'FREELANCER',
        status: 'PENDING'
      });
      createdUser = user;

      try {
        await FreelancerProfile.create({
          userId: user._id,
          enrollmentNumber: trimmedEnrollment,
          branch: branch.trim(),
          year: Number(year),
          phone: phone.trim()
        });
      } catch (profileError) {
        // Rollback orphaned user document
        console.error('[Registration Rollback] FreelancerProfile creation failed; removing orphaned User:', profileError.message);
        if (createdUser && createdUser._id) {
          await User.findByIdAndDelete(createdUser._id);
        }
        throw profileError;
      }
    }

    // 5. Registration Success - Do not log user in automatically
    req.flash('success_msg', 'Your Phoenix registration has been submitted.');
    req.flash('info_msg', 'An administrator will review your profile before you can access freelancing opportunities.');
    
    return res.redirect('/account/pending');
  } catch (error) {
    console.error('[Register Controller Error]:', error);
    req.flash('error_msg', 'An unexpected error occurred during registration. Please try again.');
    return res.status(500).render('auth/register', {
      title: 'Freelancer Registration | PHOENIX - MBM University',
      activePage: 'register',
      formData,
      errors: { general: { msg: 'Registration failed due to a server error. Please try again.' } }
    });
  }
};

/**
 * Handle User Logout
 * POST /logout
 */
const logout = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('[Logout Error] Session destruction failed:', err);
      }
      res.clearCookie('phoenix.sid');
      return res.redirect('/');
    });
  } else {
    return res.redirect('/');
  }
};

/**
 * Get Current Authenticated User Info
 * GET /auth/me
 */
const getCurrentUser = (req, res) => {
  if (!req.user) {
    return res.status(200).json({
      authenticated: false
    });
  }

  return res.status(200).json({
    authenticated: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status
    }
  });
};

/**
 * Render Pending Account Status Page
 * GET /account/pending
 */
const showPending = (req, res) => {
  res.render('auth/pending', {
    title: 'Account Pending Review | PHOENIX',
    activePage: 'pending'
  });
};

/**
 * Render Suspended Account Status Page
 * GET /account/suspended
 */
const showSuspended = (req, res) => {
  res.render('auth/suspended', {
    title: 'Account Suspended | PHOENIX',
    activePage: 'suspended'
  });
};

/**
 * Render Rejected Account Status Page
 * GET /account/rejected
 */
const showRejected = (req, res) => {
  res.render('auth/rejected', {
    title: 'Registration Rejected | PHOENIX',
    activePage: 'rejected'
  });
};

module.exports = {
  showLogin,
  login,
  showRegister,
  register,
  logout,
  getCurrentUser,
  showPending,
  showSuspended,
  showRejected
};
