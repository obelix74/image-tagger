"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAdmin = exports.requireAuth = void 0;
const UserService_1 = require("../services/UserService");
const requireAuth = async (req, res, next) => {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }
        const user = await UserService_1.UserService.findUserById(userId);
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'User not found'
            });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.requireAuth = requireAuth;
const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }
        const user = await UserService_1.UserService.findUserById(userId);
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'User not found'
            });
            return;
        }
        if (!user.isAdmin) {
            res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Admin auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.requireAdmin = requireAdmin;
const optionalAuth = async (req, res, next) => {
    try {
        const userId = req.session?.userId;
        if (userId) {
            const user = await UserService_1.UserService.findUserById(userId);
            if (user) {
                req.user = user;
            }
        }
        next();
    }
    catch (error) {
        console.error('Optional auth middleware error:', error);
        // Don't fail on optional auth errors, just continue without user
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map