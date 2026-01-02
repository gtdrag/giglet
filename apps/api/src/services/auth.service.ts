import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { logger } from '../utils/logger';
import { generateAccessToken, generateRefreshToken, parseExpiry } from '../utils/jwt';
import { AppError, errors } from '../middleware/error.middleware';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  AppleAuthInput,
  GoogleAuthInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../schemas/auth.schema';

// Apple's public key endpoint for token verification
const APPLE_JWKS_URL = new URL('https://appleid.apple.com/auth/keys');
const appleJWKS = createRemoteJWKSet(APPLE_JWKS_URL);

// Google OAuth client for token verification
const googleClient = new OAuth2Client();

const BCRYPT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}

class AuthService {
  /**
   * Register a new user with email and password
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const { email, password, name } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw errors.conflict('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        authProvider: 'EMAIL',
      },
    });

    // Generate tokens
    const tokens = await this.generateTokensForUser(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tokens,
    };
  }

  /**
   * Login with email and password
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw errors.unauthorized('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw errors.unauthorized('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokensForUser(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(input: RefreshTokenInput): Promise<AuthTokens> {
    const { refreshToken } = input;

    // Find refresh token in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw errors.unauthorized('Invalid refresh token');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw errors.unauthorized('Refresh token expired');
    }

    // Delete old refresh token (rotate tokens)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Generate new tokens
    return this.generateTokensForUser(storedToken.user);
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    // Delete refresh token from database
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  /**
   * Sign in with Apple
   * Verifies Apple identity token and creates/finds user
   */
  async appleAuth(input: AppleAuthInput): Promise<AuthResult> {
    const { identityToken, email, fullName } = input;

    // Verify Apple identity token
    let appleUserId: string;
    let tokenEmail: string | undefined;

    try {
      const { payload } = await jwtVerify(identityToken, appleJWKS, {
        issuer: 'https://appleid.apple.com',
        audience: config.appleBundleId,
      });

      // Extract Apple user ID from the 'sub' claim
      appleUserId = payload.sub as string;
      tokenEmail = payload.email as string | undefined;
    } catch (error) {
      throw errors.unauthorized('Invalid Apple identity token');
    }

    // Check if user already exists with this Apple ID
    let user = await prisma.user.findUnique({
      where: { appleId: appleUserId },
    });

    if (!user) {
      // New user - create account
      // Use email from token or from input (Apple only provides on first sign-in)
      const userEmail = tokenEmail || email;

      if (!userEmail) {
        throw errors.validation('Email is required for registration');
      }

      // Check if email is already used by another account
      const existingUser = await prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (existingUser) {
        // Link Apple ID to existing account
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            appleId: appleUserId,
            authProvider: 'APPLE',
          },
        });
      } else {
        // Create new user
        const name =
          fullName?.givenName && fullName?.familyName
            ? `${fullName.givenName} ${fullName.familyName}`
            : fullName?.givenName || fullName?.familyName || undefined;

        user = await prisma.user.create({
          data: {
            email: userEmail,
            appleId: appleUserId,
            authProvider: 'APPLE',
            name,
          },
        });
      }
    }

    // Generate tokens
    const tokens = await this.generateTokensForUser(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tokens,
    };
  }

  /**
   * Sign in with Google
   * Verifies Google ID token and creates/finds user
   */
  async googleAuth(input: GoogleAuthInput): Promise<AuthResult> {
    const { idToken } = input;

    // Verify Google ID token
    let googleUserId: string;
    let email: string;
    let name: string | undefined;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.googleClientId || undefined,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('No payload in token');
      }

      googleUserId = payload.sub;
      email = payload.email as string;
      name = payload.name;

      if (!email) {
        throw new Error('No email in token');
      }
    } catch (error) {
      throw errors.unauthorized('Invalid Google ID token');
    }

    // Check if user already exists with this Google ID
    let user = await prisma.user.findUnique({
      where: { googleId: googleUserId },
    });

    if (!user) {
      // Check if email is already used by another account
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        // Link Google ID to existing account
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            googleId: googleUserId,
            authProvider: 'GOOGLE',
          },
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            googleId: googleUserId,
            authProvider: 'GOOGLE',
            name,
          },
        });
      }
    }

    // Generate tokens
    const tokens = await this.generateTokensForUser(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tokens,
    };
  }

  /**
   * Request password reset - generates token and sends email
   */
  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const { email } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      logger.info('Password reset requested for non-existent email', { email });
      return;
    }

    // Check if user has a password (not SSO-only account)
    if (!user.passwordHash) {
      logger.info('Password reset requested for SSO-only account', { email });
      return;
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate secure token (32 bytes, URL-safe base64)
    const token = crypto.randomBytes(32).toString('base64url');

    // Store token with 1 hour expiry
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // TODO: Send email with reset link
    // For now, log the token for development
    logger.info('Password reset token generated', {
      email,
      token,
      expiresAt,
      resetUrl: `giglet://reset-password?token=${token}`,
    });
  }

  /**
   * Reset password using token
   */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const { token, newPassword } = input;

    // Find token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw errors.unauthorized('Invalid or expired reset token');
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      throw errors.unauthorized('Reset token has expired. Please request a new one.');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update user password and delete token in transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    logger.info('Password reset successful', { userId: resetToken.userId });
  }

  /**
   * Generate access and refresh tokens for a user
   */
  private async generateTokensForUser(user: { id: string; email: string }): Promise<AuthTokens> {
    // Generate access token
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      tier: 'FREE', // Default tier for new users
    });

    // Generate refresh token
    const refreshToken = generateRefreshToken();

    // Calculate refresh token expiry
    const expiresAt = parseExpiry(config.refreshTokenExpiresIn);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();
