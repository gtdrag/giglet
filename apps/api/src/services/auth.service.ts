import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { generateAccessToken, generateRefreshToken, parseExpiry } from '../utils/jwt';
import { AppError, errors } from '../middleware/error.middleware';
import type { RegisterInput } from '../schemas/auth.schema';

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
