/**
 * PDF Generator Service for IRS-compliant mileage log export
 * Uses expo-print to generate PDF from HTML template
 */

import * as Print from 'expo-print';
import type { MileageExportRow } from './csvGenerator';
import type { DateRange } from '../../utils/dateRange';
import { formatDateShort, formatDateISO } from '../../utils/dateRange';
import { IRS_MILEAGE_RATE, formatUSD } from '../../constants/tax';

/**
 * Generate HTML template for the mileage log PDF
 */
const generateMileageLogHTML = (
  trips: MileageExportRow[],
  dateRange: DateRange,
  userName: string = 'Giglet User'
): string => {
  // Calculate totals
  const totalMiles = trips.reduce((sum, trip) => sum + trip.miles, 0);
  const taxDeduction = totalMiles * IRS_MILEAGE_RATE;

  // Generate table rows
  const tableRows = trips
    .map(
      (trip, index) => `
    <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
      <td>${trip.date}</td>
      <td>${trip.businessPurpose}</td>
      <td>${trip.startLocation}</td>
      <td>${trip.endLocation}</td>
      <td class="miles">${trip.miles.toFixed(1)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mileage Log</title>
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

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: left;
    }

    th {
      background-color: #f4f4f4;
      font-weight: bold;
      font-size: 11px;
    }

    td {
      font-size: 10px;
    }

    tr.even {
      background-color: #fafafa;
    }

    tr.odd {
      background-color: #fff;
    }

    .miles {
      text-align: right;
      font-family: monospace;
    }

    .totals {
      font-weight: bold;
      background-color: #e8e8e8 !important;
    }

    .totals td {
      font-size: 11px;
    }

    .summary {
      margin-top: 20px;
      padding: 15px;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .summary h3 {
      font-size: 13px;
      margin-bottom: 10px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 11px;
    }

    .summary-row .label {
      color: #555;
    }

    .summary-row .value {
      font-weight: bold;
    }

    .disclaimer {
      margin-top: 20px;
      padding: 10px;
      background-color: #fff8dc;
      border: 1px solid #e6d8a0;
      border-radius: 4px;
      font-size: 9px;
      color: #666;
    }

    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 9px;
      color: #999;
      padding-top: 15px;
      border-top: 1px solid #ddd;
    }

    @media print {
      body {
        padding: 0;
      }

      .disclaimer, .footer {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Mileage Log</h1>
    <p class="period">${formatDateShort(dateRange.startDate)} - ${formatDateShort(dateRange.endDate)}</p>
    <p class="generated">Generated on ${formatDateShort(new Date())} for ${userName}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 12%;">Date</th>
        <th style="width: 20%;">Business Purpose</th>
        <th style="width: 28%;">Start Location</th>
        <th style="width: 28%;">End Location</th>
        <th style="width: 12%;">Miles</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="totals">
        <td colspan="4">TOTAL</td>
        <td class="miles">${totalMiles.toFixed(1)}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <h3>Summary</h3>
    <div class="summary-row">
      <span class="label">Total Trips:</span>
      <span class="value">${trips.length}</span>
    </div>
    <div class="summary-row">
      <span class="label">Total Miles:</span>
      <span class="value">${totalMiles.toFixed(1)} miles</span>
    </div>
    <div class="summary-row">
      <span class="label">IRS Mileage Rate (2024):</span>
      <span class="value">${formatUSD(IRS_MILEAGE_RATE)}/mile</span>
    </div>
    <div class="summary-row">
      <span class="label">Estimated Tax Deduction:</span>
      <span class="value">${formatUSD(taxDeduction)}</span>
    </div>
  </div>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This mileage log is provided for informational purposes only and does not constitute
    tax advice. The IRS standard mileage rate used (${formatUSD(IRS_MILEAGE_RATE)}/mile for 2024) is subject to change.
    Consult with a qualified tax professional for guidance on your specific tax situation. Keep this log and
    any supporting documentation for your records.
  </div>

  <div class="footer">
    Generated by Giglet - Your Gig Economy Companion
  </div>
</body>
</html>
  `;
};

/**
 * Generate PDF file from mileage export data
 * Returns the URI of the generated PDF file
 */
export const generateMileagePDF = async (
  trips: MileageExportRow[],
  dateRange: DateRange,
  userName?: string
): Promise<string> => {
  const html = generateMileageLogHTML(trips, dateRange, userName);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
};

/**
 * Generate filename for the PDF export
 */
export const generatePDFFilename = (dateRange: DateRange): string => {
  const startStr = formatDateISO(dateRange.startDate).replace(/-/g, '');
  const endStr = formatDateISO(dateRange.endDate).replace(/-/g, '');
  return `mileage-log-${startStr}-${endStr}.pdf`;
};
