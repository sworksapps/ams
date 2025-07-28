/**
 * Authentication middleware for extracting user information from headers
 * forwarded by AWS API Gateway Lambda Authorizer
 */

// Global variable to store current user context
let globalUserContext = null;

const extractUserFromHeaders = (req, res, next) => {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ No valid Authorization header found');
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'User authentication required - missing or invalid Authorization header' 
      });
    }

    // Extract the token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Decode JWT token (without verification for now - just extract payload)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }
      
      // Decode the payload (base64url decode)
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
      
      // Extract user information from Keycloak token
      const user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.preferred_username,
        username: payload.preferred_username,
        phone: payload.phone_number,
        roles: payload.realm_access?.roles || [],
        groups: payload.groups || [],
        clientRoles: payload.resource_access || {},
        token: token // Store the original token for external API calls
      };
      
      // Store user in request and global context
      req.user = user;
      globalUserContext = user;
      
      // Log user information for debugging
      console.log('🔐 Authenticated User:', {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        roles: user.roles,
        endpoint: req.path
      });
      
      // Check if user ID is present (minimum requirement)
      if (!user.id) {
        console.warn('⚠️ No user ID found in token');
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Invalid token - missing user ID' 
        });
      }
      
      next();
      
    } catch (tokenError) {
      console.error('❌ Error parsing JWT token:', tokenError.message);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid or malformed token' 
      });
    }
    
  } catch (error) {
    console.error('❌ Error in authentication middleware:', error);
    return res.status(500).json({ 
      error: 'Authentication Error', 
      message: 'Failed to process user authentication' 
    });
  }
};

// Function to get current user context globally
const getCurrentUser = () => {
  return globalUserContext;
};

/**
 * Optional authentication middleware - allows requests without authentication
 * but extracts user info if available
 */
const optionalAuth = (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || req.headers['x-user-sub'];
    
    if (userId) {
      // User is authenticated, extract full info
      extractUserFromHeaders(req, res, next);
    } else {
      // No authentication, set user to null and continue
      req.user = null;
      console.log('ℹ️ Request without authentication:', req.path);
      next();
    }
  } catch (error) {
    console.error('❌ Error in optional auth:', error);
    req.user = null;
    next();
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      console.warn('🚫 Access denied for user:', {
        userId: req.user.id,
        userRoles: userRoles,
        requiredRoles: roles,
        endpoint: req.path
      });

      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Insufficient permissions',
        requiredRoles: roles,
        userRoles: userRoles
      });
    }

    console.log('✅ Role check passed:', {
      userId: req.user.id,
      roles: userRoles,
      endpoint: req.path
    });

    next();
  };
};

/**
 * Debug middleware to log all headers (for development/testing)
 */
const debugHeaders = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 All Headers:', req.headers);
    
    // Extract potential auth headers
    const authHeaders = {};
    Object.keys(req.headers).forEach(key => {
      if (key.startsWith('x-user-') || key.startsWith('x-auth-') || key === 'authorization') {
        authHeaders[key] = req.headers[key];
      }
    });
    
    console.log('🔍 Auth Headers:', authHeaders);
  }
  next();
};

module.exports = {
  extractUserFromHeaders,
  optionalAuth,
  getCurrentUser,
  requireRole,
  debugHeaders
};
