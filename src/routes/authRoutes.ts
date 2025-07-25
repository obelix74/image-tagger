import express from 'express';
import { UserService } from '../services/UserService';
import { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '../types';

const router = express.Router();

// Login with username/password
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
      return;
    }

    const user = await UserService.authenticateUser(username, password);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
      return;
    }

    // Store user in session
    (req.session as any).userId = user.id;

    const userResponse: UserResponse = {
      id: user.id!,
      username: user.username,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };

    const response: AuthResponse = {
      success: true,
      user: userResponse
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Register new user
router.post('/register', async (req, res): Promise<void> => {
  try {
    const { username, password, name, email }: RegisterRequest = req.body;

    if (!username || !password || !name) {
      res.status(400).json({
        success: false,
        error: 'Username, password, and name are required'
      });
      return;
    }

    // Check if username already exists
    const existingUser = await UserService.findUserByUsername(username);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'Username already exists'
      });
      return;
    }

    const user = await UserService.createUser({
      username,
      password,
      name,
      email,
      isAdmin: false
    });

    // Store user in session
    (req.session as any).userId = user.id;

    const userResponse: UserResponse = {
      id: user.id!,
      username: user.username,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };

    const response: AuthResponse = {
      success: true,
      user: userResponse
    };

    res.json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get current user
router.get('/user', async (req, res): Promise<void> => {
  try {
    const userId = (req.session as any)?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const user = await UserService.findUserById(userId);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const userResponse: UserResponse = {
      id: user.id!,
      username: user.username,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };

    const response: AuthResponse = {
      success: true,
      user: userResponse
    };

    res.json(response);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({
        success: false,
        error: 'Session cleanup failed'
      });
    }

    res.clearCookie('connect.sid');
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Check authentication status
router.get('/status', async (req, res): Promise<void> => {
  try {
    const userId = (req.session as any)?.userId;

    if (!userId) {
      res.json({
        authenticated: false,
        user: null
      });
      return;
    }

    const user = await UserService.findUserById(userId);

    const userResponse: UserResponse | null = user ? {
      id: user.id!,
      username: user.username,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    } : null;

    res.json({
      authenticated: !!user,
      user: userResponse
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.json({
      authenticated: false,
      user: null
    });
  }
});

export { router as authRoutes };
