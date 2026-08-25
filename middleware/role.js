/**
 * Role-Based Access Control (RBAC) Middleware
 * Ensures the authenticated user possesses one of the authorized roles.
 * Role information is strictly verified from req.user (loaded from MongoDB).
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Must be authenticated
    if (!req.user) {
      req.flash('error_msg', 'You must be logged in to access this page.');
      return res.redirect('/login');
    }

    // 2. Check if user's role is in allowedRoles
    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`[RBAC Violation] User ${req.user._id} with role '${req.user.role}' attempted unauthorized access. Required: [${allowedRoles.join(', ')}]`);
      return res.status(403).render('errors/403', {
        title: '403 - Unauthorized Access | PHOENIX',
        message: 'You do not have permission to access this resource.',
        user: req.user
      });
    }

    next();
  };
};

module.exports = {
  requireRole
};
