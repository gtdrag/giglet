/**
 * Earnings PDF Generator Service
 * Generates PDF exports of earnings data with platform and monthly breakdowns
 * Uses expo-print to generate PDF from HTML template
 */

import * as Print from 'expo-print';
import type { Delivery } from '../earnings';
import type { DateRange } from '../../utils/dateRange';
import { formatDateShort, formatDateISO } from '../../utils/dateRange';
import {
  aggregateByPlatform,
  aggregateByMonth,
  type MonthlyBreakdown,
  type PlatformBreakdown,
} from './earningsCsvGenerator';

/**
 * Format currency for display
 */
const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

/**
 * Generate monthly breakdown table rows HTML
 */
const generateMonthlyRows = (monthlyBreakdown: MonthlyBreakdown[]): string => {
  if (monthlyBreakdown.length === 0) {
    return '<tr><td colspan="4" class="no-data">No data for selected period</td></tr>';
  }

  return monthlyBreakdown
    .map(
      (month) => `
    <tr>
      <td>${month.monthLabel}</td>
      <td class="amount">${formatCurrency(month.doordash)}</td>
      <td class="amount">${formatCurrency(month.ubereats)}</td>
      <td class="amount total">${formatCurrency(month.total)}</td>
    </tr>
  `
    )
    .join('');
};

/**
 * Generate HTML template for the earnings summary PDF
 */
const generateEarningsSummaryHTML = (
  deliveries: Delivery[],
  dateRange: DateRange,
  userName: string = 'Giglet User'
): string => {
  // Calculate aggregations
  const platformBreakdown = aggregateByPlatform(deliveries);
  const monthlyBreakdown = aggregateByMonth(deliveries);

  // Calculate totals
  let totalTips = 0;
  let totalBasePay = 0;
  for (const delivery of deliveries) {
    totalTips += delivery.tip;
    totalBasePay += delivery.basePay;
  }

  const monthlyRows = generateMonthlyRows(monthlyBreakdown);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Earnings Summary</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #333;
    }

    .header h1 {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .header .period {
      font-size: 14px;
      color: #555;
      margin-bottom: 4px;
    }

    .header .generated {
      font-size: 10px;
      color: #888;
    }

    .summary-section {
      margin-bottom: 25px;
    }

    .summary-section h2 {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }

    .summary-box {
      background-color: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
    }

    .stat-grid {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }

    .stat-item {
      text-align: center;
      flex: 1;
    }

    .stat-value {
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }

    .stat-label {
      font-size: 10px;
      color: #666;
      margin-top: 4px;
    }

    .platform-breakdown {
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }

    .platform-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .platform-row:last-child {
      border-bottom: none;
    }

    .platform-row.total {
      font-weight: bold;
      border-top: 2px solid #333;
      margin-top: 8px;
      padding-top: 12px;
    }

    .platform-name {
      display: flex;
      align-items: center;
    }

    .platform-icon {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      margin-right: 8px;
    }

    .doordash-icon {
      background-color: #FF3008;
    }

    .ubereats-icon {
      background-color: #06C167;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 8px 10px;
      text-align: left;
    }

    th {
      background-color: #f4f4f4;
      font-weight: bold;
      font-size: 11px;
    }

    td.amount {
      text-align: right;
      font-family: 'Courier New', monospace;
    }

    td.total {
      font-weight: bold;
    }

    tr:nth-child(even) {
      background-color: #fafafa;
    }

    .totals-row {
      background-color: #e8e8e8 !important;
      font-weight: bold;
    }

    .no-data {
      text-align: center;
      color: #888;
      font-style: italic;
      padding: 20px;
    }

    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #888;
      text-align: center;
    }

    .disclaimer {
      font-style: italic;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Earnings Summary</h1>
    <p class="period">${formatDateShort(dateRange.startDate)} - ${formatDateShort(dateRange.endDate)}</p>
    <p class="generated">Generated for ${userName} on ${formatDateShort(new Date())}</p>
  </div>

  <div class="summary-section">
    <h2>Overview</h2>
    <div class="summary-box">
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value">${deliveries.length}</div>
          <div class="stat-label">Total Deliveries</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${formatCurrency(platformBreakdown.total)}</div>
          <div class="stat-label">Total Earnings</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${formatCurrency(totalBasePay)}</div>
          <div class="stat-label">Base Pay</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${formatCurrency(totalTips)}</div>
          <div class="stat-label">Tips</div>
        </div>
      </div>

      <div class="platform-breakdown">
        <div class="platform-row">
          <span class="platform-name">
            <span class="platform-icon doordash-icon"></span>
            DoorDash
          </span>
          <span>${formatCurrency(platformBreakdown.doordash)}</span>
        </div>
        <div class="platform-row">
          <span class="platform-name">
            <span class="platform-icon ubereats-icon"></span>
            Uber Eats
          </span>
          <span>${formatCurrency(platformBreakdown.ubereats)}</span>
        </div>
        <div class="platform-row total">
          <span>Total</span>
          <span>${formatCurrency(platformBreakdown.total)}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="summary-section">
    <h2>Monthly Breakdown</h2>
    <table>
      <thead>
        <tr>
          <th>Month</th>
          <th>DoorDash</th>
          <th>Uber Eats</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${monthlyRows}
        <tr class="totals-row">
          <td><strong>TOTAL</strong></td>
          <td class="amount">${formatCurrency(platformBreakdown.doordash)}</td>
          <td class="amount">${formatCurrency(platformBreakdown.ubereats)}</td>
          <td class="amount">${formatCurrency(platformBreakdown.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p class="disclaimer">This report is for informational purposes only. Please consult a tax professional for official tax advice.</p>
    <p>Generated by Giglet</p>
  </div>
</body>
</html>
  `;
};

/**
 * Generate PDF from earnings data
 * Returns the file path to the generated PDF
 */
export const generateEarningsPDF = async (
  deliveries: Delivery[],
  dateRange: DateRange,
  userName?: string
): Promise<string> => {
  const html = generateEarningsSummaryHTML(deliveries, dateRange, userName);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
};

/**
 * Generate filename for the earnings PDF export
 */
export const generateEarningsPDFFilename = (dateRange: DateRange): string => {
  const startStr = formatDateISO(dateRange.startDate).replace(/-/g, '');
  const endStr = formatDateISO(dateRange.endDate).replace(/-/g, '');
  return `earnings-summary-${startStr}-${endStr}.pdf`;
};
