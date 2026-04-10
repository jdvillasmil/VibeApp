const authService = require('../services/auth.service');

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    const avatarUrl = req.file?.path || null;

    const user = await authService.register({ name, email, password, avatarUrl });
    const token = authService.signToken(user);

    return res.status(201).json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
        },
        token,
      },
      error: null,
      message: 'Registered',
    });
  } catch (err) {
    const msg = err.message || '';
    if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
      return res.status(409).json({
        data: null,
        error: 'CONFLICT',
        message: 'Email already in use',
      });
    }
    return res.status(500).json({
      data: null,
      error: 'INTERNAL_ERROR',
      message: 'Registration failed',
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await authService.login({ email, password });

    delete user.password_hash;

    const token = authService.signToken(user);

    return res.status(200).json({
      data: { user, token },
      error: null,
      message: 'Logged in',
    });
  } catch (err) {
    if (err.message === 'Invalid credentials') {
      return res.status(401).json({
        data: null,
        error: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      });
    }
    return res.status(500).json({
      data: null,
      error: 'INTERNAL_ERROR',
      message: 'Login failed',
    });
  }
}

module.exports = { register, login };
