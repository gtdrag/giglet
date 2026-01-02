import puppeteer, { Browser, Page, Cookie } from 'puppeteer';
import { logger } from '../../utils/logger';

// DoorDash URLs
const DOORDASH_LOGIN_URL = 'https://identity.doordash.com/auth/user/phoneemail';
const DOORDASH_DASHER_URL = 'https://dasher.doordash.com';
const DOORDASH_EARNINGS_URL = 'https://dasher.doordash.com/earnings';

// Rate limiting constants
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;
const PAGE_LOAD_TIMEOUT = 30000;

export interface DoorDashCredentials {
  email: string;
  password: string;
}

export interface DoorDashSession {
  cookies: Cookie[];
  expiresAt: Date;
}

export interface DoorDashDelivery {
  externalId: string;
  earnings: number;
  tip: number;
  basePay: number;
  restaurantName: string | null;
  deliveredAt: Date;
}

export interface DoorDashSyncResult {
  deliveries: DoorDashDelivery[];
  sessionCookies: Cookie[];
}

/**
 * DoorDash scraping service using Puppeteer
 * Handles login, session management, and earnings data extraction
 */
class DoorDashService {
  private browser: Browser | null = null;

  /**
   * Get or create browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
      });

      logger.info('Puppeteer browser launched');
    }

    return this.browser;
  }

  /**
   * Add random delay to appear more human-like
   */
  private async randomDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Login to DoorDash and get session cookies
   */
  async login(credentials: DoorDashCredentials): Promise<DoorDashSession> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      logger.info('Navigating to DoorDash login page');

      // Navigate to login page
      await page.goto(DOORDASH_LOGIN_URL, {
        waitUntil: 'networkidle2',
        timeout: PAGE_LOAD_TIMEOUT,
      });

      await this.randomDelay();

      // Enter email
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });
      await page.type('input[name="email"]', credentials.email, { delay: 50 });

      await this.randomDelay();

      // Click continue (DoorDash uses multi-step login)
      const continueButton = await page.$('button[type="submit"]');
      if (continueButton) {
        await continueButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: PAGE_LOAD_TIMEOUT });
      }

      await this.randomDelay();

      // Enter password
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await page.type('input[name="password"]', credentials.password, { delay: 50 });

      await this.randomDelay();

      // Submit login
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      }

      // Wait for navigation to complete (either success or error)
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: PAGE_LOAD_TIMEOUT });

      // Check for login errors
      const errorElement = await page.$('[data-testid="error-message"], .error-message');
      if (errorElement) {
        const errorText = await page.evaluate((el) => el.textContent, errorElement);
        throw new Error(`Login failed: ${errorText}`);
      }

      // Verify we're logged in by checking for dasher dashboard elements
      const currentUrl = page.url();
      if (!currentUrl.includes('dasher.doordash.com') && !currentUrl.includes('success')) {
        // Try navigating to dasher portal directly
        await page.goto(DOORDASH_DASHER_URL, {
          waitUntil: 'networkidle2',
          timeout: PAGE_LOAD_TIMEOUT,
        });

        // Check if we're redirected back to login (not authenticated)
        if (page.url().includes('identity.doordash.com')) {
          throw new Error('Login failed: Invalid credentials');
        }
      }

      // Get session cookies
      const cookies = await page.cookies();

      // Session expires in 24 hours (conservative estimate)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      logger.info('DoorDash login successful');

      return { cookies, expiresAt };
    } catch (error) {
      logger.error('DoorDash login failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Check if session is still valid
   */
  async checkSession(session: DoorDashSession): Promise<boolean> {
    if (session.expiresAt < new Date()) {
      return false;
    }

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setCookie(...session.cookies);
      await page.goto(DOORDASH_DASHER_URL, {
        waitUntil: 'networkidle2',
        timeout: PAGE_LOAD_TIMEOUT,
      });

      // If redirected to login page, session is invalid
      return !page.url().includes('identity.doordash.com');
    } catch {
      return false;
    } finally {
      await page.close();
    }
  }

  /**
   * Fetch earnings data from DoorDash
   * @param session Valid session from login()
   * @param since Fetch deliveries since this date
   */
  async fetchEarnings(session: DoorDashSession, since: Date): Promise<DoorDashSyncResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Set session cookies
      await page.setCookie(...session.cookies);

      // Enable request interception to capture API responses
      const deliveries: DoorDashDelivery[] = [];

      await page.setRequestInterception(true);

      page.on('request', (request) => {
        request.continue();
      });

      // Intercept responses to capture earnings API data
      page.on('response', async (response) => {
        const url = response.url();

        // DoorDash often has internal APIs for earnings data
        if (url.includes('/api/') && (url.includes('earning') || url.includes('delivery'))) {
          try {
            const data = await response.json();
            const parsed = this.parseEarningsResponse(data, since);
            deliveries.push(...parsed);
          } catch {
            // Response might not be JSON, ignore
          }
        }
      });

      logger.info('Navigating to DoorDash earnings page');

      // Navigate to earnings page
      await page.goto(DOORDASH_EARNINGS_URL, {
        waitUntil: 'networkidle2',
        timeout: PAGE_LOAD_TIMEOUT,
      });

      await this.randomDelay();

      // If no API data captured, fall back to scraping the page
      if (deliveries.length === 0) {
        const scrapedDeliveries = await this.scrapeEarningsPage(page, since);
        deliveries.push(...scrapedDeliveries);
      }

      // Get updated cookies
      const cookies = await page.cookies();

      logger.info('DoorDash earnings fetch complete', {
        deliveryCount: deliveries.length,
      });

      return { deliveries, sessionCookies: cookies };
    } catch (error) {
      logger.error('DoorDash earnings fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Parse earnings data from DoorDash API response
   */
  private parseEarningsResponse(data: unknown, since: Date): DoorDashDelivery[] {
    const deliveries: DoorDashDelivery[] = [];

    // DoorDash API structure varies - this handles common patterns
    const items = this.extractDeliveryItems(data);

    for (const item of items) {
      try {
        const timestamp = item.completed_at || item.deliveredAt || item.timestamp;
        if (!timestamp) continue;
        const deliveredAt = new Date(String(timestamp));

        // Skip if before our sync date
        if (deliveredAt < since) continue;

        const restaurantName = item.store_name || item.restaurant || item.storeName;
        const delivery: DoorDashDelivery = {
          externalId: String(item.id || item.delivery_id || item.deliveryId),
          earnings: this.parseAmount(item.total || item.earnings || item.total_amount),
          tip: this.parseAmount(item.tip || item.tip_amount || 0),
          basePay: this.parseAmount(item.base_pay || item.basePay || item.dasher_pay || 0),
          restaurantName: typeof restaurantName === 'string' ? restaurantName : null,
          deliveredAt,
        };

        // Calculate basePay if only total and tip are available
        if (delivery.basePay === 0 && delivery.earnings > 0) {
          delivery.basePay = delivery.earnings - delivery.tip;
        }

        deliveries.push(delivery);
      } catch {
        // Skip malformed items
      }
    }

    return deliveries;
  }

  /**
   * Extract delivery items from various API response structures
   */
  private extractDeliveryItems(data: unknown): Record<string, unknown>[] {
    if (!data || typeof data !== 'object') return [];

    const obj = data as Record<string, unknown>;

    // Try common response structures
    if (Array.isArray(obj.deliveries)) return obj.deliveries as Record<string, unknown>[];
    if (Array.isArray(obj.earnings)) return obj.earnings as Record<string, unknown>[];
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[];
    if (Array.isArray(data)) return data as Record<string, unknown>[];

    return [];
  }

  /**
   * Parse monetary amount from various formats
   */
  private parseAmount(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols and convert to number
      const cleaned = value.replace(/[$,]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  /**
   * Fallback: Scrape earnings directly from page HTML
   */
  private async scrapeEarningsPage(page: Page, since: Date): Promise<DoorDashDelivery[]> {
    const deliveries: DoorDashDelivery[] = [];

    try {
      // Wait for earnings content to load
      await page.waitForSelector('[data-testid="earnings"], .earnings-container', {
        timeout: 10000,
      });

      // Extract delivery items from the page
      const items = await page.evaluate(() => {
        const results: {
          id: string;
          total: string;
          tip: string;
          base: string;
          restaurant: string;
          date: string;
        }[] = [];

        // Look for delivery/earnings entries
        const entries = document.querySelectorAll(
          '[data-testid="delivery-entry"], .delivery-item, .earning-item'
        );

        entries.forEach((entry, index) => {
          const total =
            entry.querySelector('.total, .amount, [data-testid="total"]')?.textContent || '0';
          const tip = entry.querySelector('.tip, [data-testid="tip"]')?.textContent || '0';
          const base = entry.querySelector('.base-pay, [data-testid="base"]')?.textContent || '0';
          const restaurant =
            entry.querySelector('.restaurant, .store-name, [data-testid="store"]')?.textContent ||
            '';
          const date =
            entry.querySelector('.date, .timestamp, [data-testid="date"]')?.textContent || '';

          results.push({
            id: `scraped-${index}-${Date.now()}`,
            total,
            tip,
            base,
            restaurant,
            date,
          });
        });

        return results;
      });

      for (const item of items) {
        try {
          // Parse date from text (format varies)
          const deliveredAt = this.parseDate(item.date);
          if (!deliveredAt || deliveredAt < since) continue;

          deliveries.push({
            externalId: item.id,
            earnings: this.parseAmount(item.total),
            tip: this.parseAmount(item.tip),
            basePay: this.parseAmount(item.base),
            restaurantName: item.restaurant || null,
            deliveredAt,
          });
        } catch {
          // Skip malformed items
        }
      }
    } catch (error) {
      logger.warn('Page scraping fallback failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return deliveries;
  }

  /**
   * Parse date from various text formats
   */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
      // Try ISO format first
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) return isoDate;

      // Try common US formats
      const formats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\w+)\s+(\d{1,2}),?\s*(\d{4})/, // Month DD, YYYY
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Close the browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Puppeteer browser closed');
    }
  }
}

// Export singleton instance
export const doorDashService = new DoorDashService();
