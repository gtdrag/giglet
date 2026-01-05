import { Platform } from 'react-native';

// Lazy import RevenueCat to avoid crash in Expo Go
let Purchases: typeof import('react-native-purchases').default | null = null;
let PURCHASES_ERROR_CODE: typeof import('react-native-purchases').PURCHASES_ERROR_CODE | null = null;

// Track if RevenueCat is available (only in development builds, not Expo Go)
let isRevenueCatAvailable = false;

// Try to load RevenueCat - will fail gracefully in Expo Go
try {
  const rnPurchases = require('react-native-purchases');
  Purchases = rnPurchases.default;
  PURCHASES_ERROR_CODE = rnPurchases.PURCHASES_ERROR_CODE;
  isRevenueCatAvailable = true;
} catch (error) {
  console.warn('[Subscriptions] RevenueCat not available - running in Expo Go or native module not linked');
  isRevenueCatAvailable = false;
}

// RevenueCat API keys from environment
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

// Entitlement identifier for Pro subscription
export const PRO_ENTITLEMENT = 'pro';

// Product identifiers
export const MONTHLY_PRODUCT_ID = 'giglet_pro_monthly';
export const ANNUAL_PRODUCT_ID = 'giglet_pro_annual';

// User-friendly error messages (will be populated if PURCHASES_ERROR_CODE is available)
const ERROR_MESSAGES: Record<string, string> = PURCHASES_ERROR_CODE ? {
  [PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR]: 'Purchase was cancelled',
  [PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR]: 'There was a problem with the app store. Please try again.',
  [PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR]: 'Purchases are not allowed on this device.',
  [PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR]: 'The purchase was invalid. Please try again.',
  [PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR]: 'This product is not available for purchase.',
  [PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR]: 'You already have an active subscription.',
  [PURCHASES_ERROR_CODE.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR]: 'This receipt is already in use by another account.',
  [PURCHASES_ERROR_CODE.INVALID_RECEIPT_ERROR]: 'Invalid receipt. Please try again.',
  [PURCHASES_ERROR_CODE.MISSING_RECEIPT_FILE_ERROR]: 'Missing receipt. Please try again.',
  [PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR]: 'Invalid credentials. Please contact support.',
  [PURCHASES_ERROR_CODE.UNEXPECTED_BACKEND_RESPONSE_ERROR]: 'Unexpected error. Please try again.',
  [PURCHASES_ERROR_CODE.INVALID_APP_USER_ID_ERROR]: 'Invalid user ID. Please log out and back in.',
  [PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR]: 'A purchase is already in progress.',
  [PURCHASES_ERROR_CODE.UNKNOWN_BACKEND_ERROR]: 'An unknown error occurred. Please try again.',
} : {};

/**
 * Check if RevenueCat SDK is available
 */
export function isSubscriptionServiceAvailable(): boolean {
  return isRevenueCatAvailable && Purchases !== null;
}

/**
 * Custom error class for subscription-related errors
 */
export class SubscriptionError extends Error {
  code: string;
  userCancelled: boolean;

  constructor(message: string, code: string, userCancelled = false) {
    super(message);
    this.name = 'SubscriptionError';
    this.code = code;
    this.userCancelled = userCancelled;
  }
}

/**
 * Initialize RevenueCat SDK
 * Should be called once when the app starts
 */
export async function initializeRevenueCat(): Promise<void> {
  if (!isRevenueCatAvailable || !Purchases) {
    console.warn('[Subscriptions] RevenueCat not available - skipping initialization');
    return;
  }

  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;

  if (!apiKey) {
    console.warn('[Subscriptions] RevenueCat API key not configured for', Platform.OS);
    return;
  }

  try {
    Purchases.configure({ apiKey });
    console.log('[Subscriptions] RevenueCat initialized successfully');
  } catch (error) {
    console.error('[Subscriptions] Failed to initialize RevenueCat:', error);
  }
}

/**
 * Identify the user with RevenueCat
 * Should be called after successful login
 */
export async function identifyUser(userId: string): Promise<unknown | null> {
  if (!isRevenueCatAvailable || !Purchases) {
    console.warn('[Subscriptions] RevenueCat not available - skipping user identification');
    return null;
  }

  try {
    const { customerInfo } = await Purchases.logIn(userId);
    console.log('[Subscriptions] RevenueCat user identified:', userId);
    return customerInfo;
  } catch (error) {
    console.error('[Subscriptions] Failed to identify user with RevenueCat:', error);
    return null;
  }
}

/**
 * Log out the current user from RevenueCat
 * Should be called when user logs out of the app
 */
export async function logoutUser(): Promise<void> {
  if (!isRevenueCatAvailable || !Purchases) {
    return;
  }

  try {
    await Purchases.logOut();
    console.log('[Subscriptions] RevenueCat user logged out');
  } catch (error) {
    console.error('[Subscriptions] Failed to log out from RevenueCat:', error);
  }
}

/**
 * Get available subscription offerings
 */
export async function getOfferings(): Promise<unknown | null> {
  if (!isRevenueCatAvailable || !Purchases) {
    console.warn('[Subscriptions] RevenueCat not available - cannot fetch offerings');
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error('[Subscriptions] Failed to fetch offerings:', error);
    return null;
  }
}

/**
 * Get the monthly subscription package
 */
export async function getMonthlyPackage(): Promise<unknown | null> {
  const offerings = await getOfferings() as { current?: { monthly?: unknown } } | null;
  return offerings?.current?.monthly || null;
}

/**
 * Get the annual subscription package
 */
export async function getAnnualPackage(): Promise<unknown | null> {
  const offerings = await getOfferings() as { current?: { annual?: unknown } } | null;
  return offerings?.current?.annual || null;
}

/**
 * Get current customer info including subscription status
 */
export async function getCustomerInfo(): Promise<unknown | null> {
  if (!isRevenueCatAvailable || !Purchases) {
    return null;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('[Subscriptions] Failed to get customer info:', error);
    return null;
  }
}

/**
 * Check if the user has an active Pro subscription
 */
export async function hasProAccess(): Promise<boolean> {
  const customerInfo = await getCustomerInfo() as { entitlements?: { active?: Record<string, unknown> } } | null;
  if (!customerInfo) return false;
  return PRO_ENTITLEMENT in (customerInfo.entitlements?.active || {});
}

// Type guard to check if error is a RevenueCat error
function isPurchasesError(error: unknown): error is { code: string; message?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

/**
 * Purchase a subscription package
 * @throws SubscriptionError on failure (except user cancellation)
 */
export async function purchasePackage(pkg: unknown): Promise<unknown> {
  if (!isRevenueCatAvailable || !Purchases) {
    throw new SubscriptionError(
      'In-app purchases are not available. Please use a development build.',
      'NOT_AVAILABLE',
      false
    );
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg as Parameters<typeof Purchases.purchasePackage>[0]);
    return customerInfo;
  } catch (error) {
    if (isPurchasesError(error) && PURCHASES_ERROR_CODE) {
      const userCancelled = error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
      const message = ERROR_MESSAGES[error.code] || error.message || 'Purchase failed. Please try again.';
      throw new SubscriptionError(message, error.code.toString(), userCancelled);
    }
    throw new SubscriptionError('An unexpected error occurred. Please try again.', 'UNKNOWN', false);
  }
}

/**
 * Purchase the monthly subscription
 * @returns true if purchase was successful, false if cancelled
 * @throws SubscriptionError on failure
 */
export async function purchaseMonthly(): Promise<boolean> {
  if (!isRevenueCatAvailable) {
    throw new SubscriptionError(
      'In-app purchases are not available. Please use a development build.',
      'NOT_AVAILABLE',
      false
    );
  }

  const monthlyPackage = await getMonthlyPackage();
  if (!monthlyPackage) {
    throw new SubscriptionError('Monthly subscription not available', 'PRODUCT_NOT_AVAILABLE', false);
  }

  try {
    const customerInfo = await purchasePackage(monthlyPackage) as { entitlements?: { active?: Record<string, unknown> } };
    return PRO_ENTITLEMENT in (customerInfo?.entitlements?.active || {});
  } catch (error) {
    if (error instanceof SubscriptionError && error.userCancelled) {
      return false; // User cancelled - not an error
    }
    throw error;
  }
}

/**
 * Purchase the annual subscription
 * @returns true if purchase was successful, false if cancelled
 * @throws SubscriptionError on failure
 */
export async function purchaseAnnual(): Promise<boolean> {
  if (!isRevenueCatAvailable) {
    throw new SubscriptionError(
      'In-app purchases are not available. Please use a development build.',
      'NOT_AVAILABLE',
      false
    );
  }

  const annualPackage = await getAnnualPackage();
  if (!annualPackage) {
    throw new SubscriptionError('Annual subscription not available', 'PRODUCT_NOT_AVAILABLE', false);
  }

  try {
    const customerInfo = await purchasePackage(annualPackage) as { entitlements?: { active?: Record<string, unknown> } };
    return PRO_ENTITLEMENT in (customerInfo?.entitlements?.active || {});
  } catch (error) {
    if (error instanceof SubscriptionError && error.userCancelled) {
      return false; // User cancelled - not an error
    }
    throw error;
  }
}

/**
 * Restore previous purchases
 * @returns true if Pro access was restored
 */
export async function restorePurchases(): Promise<boolean> {
  if (!isRevenueCatAvailable || !Purchases) {
    throw new SubscriptionError(
      'In-app purchases are not available. Please use a development build.',
      'NOT_AVAILABLE',
      false
    );
  }

  try {
    const customerInfo = await Purchases.restorePurchases() as { entitlements?: { active?: Record<string, unknown> } };
    return PRO_ENTITLEMENT in (customerInfo?.entitlements?.active || {});
  } catch (error) {
    if (isPurchasesError(error)) {
      const message = ERROR_MESSAGES[error.code] || error.message || 'Failed to restore purchases.';
      throw new SubscriptionError(message, error.code.toString(), false);
    }
    throw new SubscriptionError('Failed to restore purchases. Please try again.', 'UNKNOWN', false);
  }
}

/**
 * Get the platform-specific subscription management URL
 * Opens App Store subscription management on iOS, Play Store on Android
 */
export function getManagementUrl(): string {
  if (Platform.OS === 'ios') {
    // iOS App Store subscription management
    return 'https://apps.apple.com/account/subscriptions';
  } else {
    // Android Play Store subscription management
    return 'https://play.google.com/store/account/subscriptions';
  }
}

/**
 * Get subscription details from customer info
 */
export function getSubscriptionDetails(customerInfo: unknown): {
  isProUser: boolean;
  tier: 'FREE' | 'PRO_MONTHLY' | 'PRO_ANNUAL';
  expiresAt: Date | null;
  willRenew: boolean;
} {
  const typedInfo = customerInfo as {
    entitlements?: {
      active?: Record<string, {
        productIdentifier?: string;
        expirationDate?: string;
        willRenew?: boolean;
      }>;
    };
  } | null;

  const proEntitlement = typedInfo?.entitlements?.active?.[PRO_ENTITLEMENT];

  if (!proEntitlement) {
    return {
      isProUser: false,
      tier: 'FREE',
      expiresAt: null,
      willRenew: false,
    };
  }

  const productId = proEntitlement.productIdentifier;
  const tier = productId === ANNUAL_PRODUCT_ID ? 'PRO_ANNUAL' : 'PRO_MONTHLY';
  const expiresAt = proEntitlement.expirationDate ? new Date(proEntitlement.expirationDate) : null;
  const willRenew = proEntitlement.willRenew ?? false;

  return {
    isProUser: true,
    tier,
    expiresAt,
    willRenew,
  };
}
