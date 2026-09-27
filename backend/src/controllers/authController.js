const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { google } = require("googleapis");

const pool = require("../config/db");
const {
  registerSchema,
  loginSchema,
} = require("../validators/authValidator");

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

const getGoogleClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

// =========================
// REGISTER
// =========================

const register = async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password, fullName } = validation.data;

    const normalizedEmail = email.toLowerCase();

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, role, created_at`,
      [normalizedEmail, passwordHash, fullName]
    );

    const user = result.rows[0];

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =========================
// LOGIN
// =========================

const login = async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password } = validation.data;

    const normalizedEmail = email.toLowerCase();

    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, role
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =========================
// GOOGLE AUTH
// =========================

const googleAuth = async (req, res) => {
  try {
    const oauth2Client = getGoogleClient();

    // Generate random state to protect against CSRF
    const state = crypto.randomBytes(32).toString("hex");

    res.cookie("nexus_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
      path: "/",
    });

    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "openid",
        "email",
        "profile",
      ],
      state,
      prompt: "select_account",
    });

    return res.redirect(authorizationUrl);
  } catch (error) {
    console.error("Google auth error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to start Google authentication",
    });
  }
};

// =========================
// GOOGLE CALLBACK
// =========================

const googleCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    // User cancelled Google login
    if (error) {
      return res.redirect(
        `${frontendUrl}/?auth_error=${encodeURIComponent(
          "Google authentication was cancelled"
        )}`
      );
    }

    // Validate OAuth state
    const savedState = req.cookies.nexus_oauth_state;

    if (
      !state ||
      !savedState ||
      state !== savedState
    ) {
      return res.redirect(
        `${frontendUrl}/?auth_error=${encodeURIComponent(
          "Invalid OAuth state"
        )}`
      );
    }

    res.clearCookie("nexus_oauth_state", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    if (!code) {
      return res.redirect(
        `${frontendUrl}/?auth_error=${encodeURIComponent(
          "Google authorization code missing"
        )}`
      );
    }

    const oauth2Client = getGoogleClient();

    // Exchange authorization code for tokens
    const { tokens } =
      await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    // Get Google profile
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const { data: googleUser } =
      await oauth2.userinfo.get();

    if (
      !googleUser.email ||
      googleUser.verified_email !== true
    ) {
      return res.redirect(
        `${frontendUrl}/?auth_error=${encodeURIComponent(
          "Google account email could not be verified"
        )}`
      );
    }

    const email = googleUser.email.toLowerCase();

    const fullName =
      googleUser.name ||
      googleUser.given_name ||
      "NEXUS User";

    // Check whether the user already exists
    const existingUser = await pool.query(
      `SELECT id, email, full_name, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    let user;

    if (existingUser.rows.length > 0) {
      // Existing NEXUS account
      user = existingUser.rows[0];
    } else {
      // Create a Google-only account.
      // The random password is intentionally unusable.
      const randomPassword = crypto
        .randomBytes(32)
        .toString("hex");

      const passwordHash = await bcrypt.hash(
        randomPassword,
        12
      );

      const result = await pool.query(
        `INSERT INTO users
          (email, password_hash, full_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, full_name, role`,
        [
          email,
          passwordHash,
          fullName,
        ]
      );

      user = result.rows[0];
    }

    const token = createToken(user);

    return res.redirect(
      `${frontendUrl}/?auth_token=${encodeURIComponent(
        token
      )}`
    );
  } catch (error) {
    console.error(
      "Google callback error:",
      error
    );

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    return res.redirect(
      `${frontendUrl}/?auth_error=${encodeURIComponent(
        "Google authentication failed"
      )}`
    );
  }
};

// =========================
// GET CURRENT USER
// =========================

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, created_at
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result.rows[0];

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  googleAuth,
  googleCallback,
};