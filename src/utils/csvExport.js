/**
 * Minimal CSV builder — no external dependency.
 * Streams rows to the Express response object.
 */

const escapeCell = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // Wrap in quotes if it contains comma, newline, or double-quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const rowToCsv = (row) => row.map(escapeCell).join(',');

/**
 * Stream an array of plain-object rows as a CSV download.
 *
 * @param {Response} res - Express response
 * @param {string} filename - download filename (without .csv)
 * @param {string[]} headers - column header labels
 * @param {Array<string[]>} rows - array of cell arrays (same order as headers)
 */
const sendCsv = (res, filename, headers, rows) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  // BOM for Excel UTF-8 compatibility
  res.write('\uFEFF');
  res.write(rowToCsv(headers) + '\n');
  rows.forEach((row) => res.write(rowToCsv(row) + '\n'));
  res.end();
};

module.exports = { sendCsv };
