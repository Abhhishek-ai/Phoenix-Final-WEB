const User = require('../models/User');

/**
 * Global middleware to load authenticated user on every request if session exists
 */
const loadUser = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId).select('-passwordHash');
      if (user) {
        req.user = user;
        res.locals.user = user;
      } else {
        // User in session was deleted or no longer exists
        req.session.userId = null;
        req.user = null;
        res.locals.user = null;
      }
    } else {
      req.user = null;
      res.locals.user = null;
    }
    next();
  } catch (error) {
    console.error('[Auth Middleware Error] Failed to load user from session:', error.message);
    req.user = null;
    res.locals.user = null;
    next();
  }
};

/**
 * Middleware to enforce authentication
 * Redirects unauthenticated users to /login
 */
const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      req.flash('error_msg', 'Please log in to continue.');
      return res.redirect('/login');
    }

    // Always fetch fresh user record from MongoDB
    const user = await User.findById(req.session.userId).select('-passwordHash');
    if (!user) {
      req.session.destroy(() => {
        res.redirect('/login');
      });
      return;
    }

    req.user = user;
    res.locals.user = user;
    next();
  } catch (error) {
    console.error('[requireAuth Error]:', error.message);
    req.flash('error_msg', 'An error occurred. Please log in again.');
    res.redirect('/login');
  }
};

/**
 * Middleware to ensure user is a guest (not authenticated)
 * Redirects logged-in users to their role-appropriate destination
 */
const requireGuest = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId).select('-passwordHash');
      if (user) {
        req.user = user;
        res.locals.user = user;

        if (user.role === 'ADMIN') {
          return res.redirect('/admin/dashboard');
        }

        if (user.role === 'CLIENT') {
          return res.redirect('/client/dashboard');
        }

        if (user.role === 'FREELANCER') {
          if (user.status === 'PENDING') {
            return res.redirect('/account/pending');
          }
          if (user.status === 'SUSPENDED') {
            return res.redirect('/account/suspended');
          }
          if (user.status === 'REJECTED') {
            return res.redirect('/account/rejected');
          }
          return res.redirect('/freelancer/dashboard');
        }
      }
    }
    next();
  } catch (error) {
    console.error('[requireGuest Error]:', error.message);
    next();
  }
};

/**
 * Middleware to enforce verified ACTIVE freelancer status
 */
const requireActiveFreelancer = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      req.flash('error_msg', 'Please log in to access the student freelancer area.');
      return res.redirect('/login');
    }

    const user = await User.findById(req.session.userId).select('-passwordHash');
    if (!user) {
      req.session.destroy(() => {
        res.redirect('/login');
      });
      return;
    }

    req.user = user;
    res.locals.user = user;

    if (user.role !== 'FREELANCER') {
      console.warn(`[Access Denied] User ${user._id} with role '${user.role}' attempted freelancer-only access.`);
      return res.status(403).render('errors/403', {
        title: '403 - Forbidden | PHOENIX',
        message: 'This area is restricted to student freelancers.',
        user
      });
    }

    if (user.status === 'PENDING') {
      req.flash('info_msg', 'Your account is under coordinator review. Once approved, you can access open projects and bidding.');
      return res.redirect('/account/pending');
    }

    if (user.status === 'SUSPENDED') {
      return res.redirect('/account/suspended');
    }

    if (user.status === 'REJECTED') {
      return res.redirect('/account/rejected');
    }

    if (user.status === 'ACTIVE') {
      return next();
    }

    return res.redirect('/account/pending');
  } catch (error) {
    console.error('[requireActiveFreelancer Error]:', error.message);
    req.flash('error_msg', 'Authentication error.');
    res.redirect('/login');
  }
};

module.exports = {
  loadUser,
  requireAuth,
  requireGuest,
  requireActiveFreelancer
};
