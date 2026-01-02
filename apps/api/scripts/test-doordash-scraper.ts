/**
 * DoorDash Scraper Test Script
 *
 * Usage:
 *   npx ts-node scripts/test-doordash-scraper.ts
 *
 * Or with environment variables:
 *   DOORDASH_EMAIL=your@email.com DOORDASH_PASSWORD=yourpass npx ts-node scripts/test-doordash-scraper.ts
 *
 * This script tests the DoorDash scraper against the real site.
 * Use it to:
 *   1. Verify login works
 *   2. Discover correct page selectors
 *   3. Test earnings data extraction
 */

import { doorDashService } from '../src/services/platforms/doordash.service';
import * as readline from 'readline';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function getCredentials(): Promise<{ email: string; password: string }> {
  // Check environment variables first
  const email = process.env.DOORDASH_EMAIL;
  const password = process.env.DOORDASH_PASSWORD;

  if (email && password) {
    log('Using credentials from environment variables', 'cyan');
    return { email, password };
  }

  // Prompt for credentials
  log('\n=== DoorDash Scraper Test ===\n', 'cyan');
  log('Enter your DoorDash Dasher credentials to test the scraper.', 'yellow');
  log('(These are only used locally and not stored)\n', 'yellow');

  const inputEmail = await prompt('DoorDash Email: ');
  const inputPassword = await prompt('DoorDash Password: ');

  return { email: inputEmail, password: inputPassword };
}

async function testLogin(email: string, password: string) {
  log('\n[1/3] Testing login...', 'cyan');

  try {
    const session = await doorDashService.login({ email, password });
    log('✓ Login successful!', 'green');
    log(`  Session expires: ${session.expiresAt.toISOString()}`, 'reset');
    log(`  Cookies obtained: ${session.cookies.length}`, 'reset');
    return session;
  } catch (error) {
    log('✗ Login failed!', 'red');
    log(`  Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
    throw error;
  }
}

async function testSessionCheck(session: Awaited<ReturnType<typeof doorDashService.login>>) {
  log('\n[2/3] Testing session validation...', 'cyan');

  try {
    const isValid = await doorDashService.checkSession(session);
    if (isValid) {
      log('✓ Session is valid!', 'green');
    } else {
      log('✗ Session appears invalid', 'red');
    }
    return isValid;
  } catch (error) {
    log('✗ Session check failed!', 'red');
    log(`  Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
    return false;
  }
}

async function testFetchEarnings(session: Awaited<ReturnType<typeof doorDashService.login>>) {
  log('\n[3/3] Testing earnings fetch...', 'cyan');

  try {
    // Fetch last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    log(`  Fetching deliveries since: ${since.toISOString()}`, 'reset');

    const result = await doorDashService.fetchEarnings(session, since);

    log(`✓ Earnings fetch completed!`, 'green');
    log(`  Deliveries found: ${result.deliveries.length}`, 'reset');

    if (result.deliveries.length > 0) {
      log('\n  Sample deliveries:', 'cyan');

      // Show first 5 deliveries
      const sample = result.deliveries.slice(0, 5);
      for (const delivery of sample) {
        log(`    - ${delivery.deliveredAt.toLocaleDateString()}: $${delivery.earnings.toFixed(2)} (base: $${delivery.basePay.toFixed(2)}, tip: $${delivery.tip.toFixed(2)}) - ${delivery.restaurantName || 'Unknown'}`, 'reset');
      }

      if (result.deliveries.length > 5) {
        log(`    ... and ${result.deliveries.length - 5} more`, 'reset');
      }

      // Calculate totals
      const totals = result.deliveries.reduce(
        (acc, d) => ({
          earnings: acc.earnings + d.earnings,
          tips: acc.tips + d.tip,
          basePay: acc.basePay + d.basePay,
        }),
        { earnings: 0, tips: 0, basePay: 0 }
      );

      log('\n  Totals (last 30 days):', 'cyan');
      log(`    Total earnings: $${totals.earnings.toFixed(2)}`, 'green');
      log(`    Total tips: $${totals.tips.toFixed(2)}`, 'reset');
      log(`    Total base pay: $${totals.basePay.toFixed(2)}`, 'reset');
    } else {
      log('\n  No deliveries found. This could mean:', 'yellow');
      log('    - No deliveries in the last 30 days', 'yellow');
      log('    - Page selectors need updating', 'yellow');
      log('    - The scraper couldn\'t parse the page', 'yellow');
    }

    return result;
  } catch (error) {
    log('✗ Earnings fetch failed!', 'red');
    log(`  Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
    throw error;
  }
}

async function main() {
  try {
    const { email, password } = await getCredentials();

    if (!email || !password) {
      log('Error: Email and password are required', 'red');
      process.exit(1);
    }

    // Run tests
    const session = await testLogin(email, password);
    await testSessionCheck(session);
    await testFetchEarnings(session);

    log('\n=== All tests completed! ===\n', 'green');
    log('If earnings were found, the scraper is working correctly.', 'reset');
    log('If not, you may need to update page selectors in doordash.service.ts', 'yellow');

  } catch (error) {
    log('\n=== Test failed ===\n', 'red');
    log('Common issues:', 'yellow');
    log('  1. Wrong credentials', 'reset');
    log('  2. DoorDash login flow changed', 'reset');
    log('  3. CAPTCHA or 2FA required', 'reset');
    log('  4. IP blocked or rate limited', 'reset');
    log('\nCheck the browser behavior by running with headless: false in doordash.service.ts', 'yellow');

  } finally {
    await doorDashService.close();
    process.exit(0);
  }
}

main();
