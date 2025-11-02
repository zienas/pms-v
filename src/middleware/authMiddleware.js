// src/middleware/authMiddleware.js

const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized: You must be logged in to perform this action.' });
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'Administrator') {
        return next();
    }
    res.status(403).json({ message: 'Forbidden: Administrator access required.' });
};

const isSupervisorOrAdmin = (req, res, next) => {
    if (req.session.user && ['Administrator', 'Supervisor'].includes(req.session.user.role)) {
        return next();
    }
    res.status(403).json({ message: 'Forbidden: Supervisor or Administrator access required.' });
};

module.exports = {
    isLoggedIn,
    isAdmin,
    isSupervisorOrAdmin,
};
