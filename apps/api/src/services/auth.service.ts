import bcrypt from 'bcryptjs';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { generateAccessToken, generateRefreshToken, parseExpiry } from '../utils/jwt';
import { AppError, errors } from '../middleware/error.middleware';
import type { RegisterInput, LoginInput, RefreshTokenInput, AppleAuthInput } from '../schemas/auth.schema';

// Apple's public key endpoint for token verification
const APPLE_JWKS_URL = new URL('https://appleid.apple.com/auth/keys');
const appleJWKS = createRemoteJWKSet(APPLE_JWKS_URL);

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
