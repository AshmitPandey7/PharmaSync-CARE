/**
 * PharmaSync CARE — CSV Export Utility
 */

export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) {
    console.warn('No data provided to exportToCSV');
    return;
  }

  const separator = ',';
  const keys = Object.keys(rows[0]);

  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let val = row[k] === null || row[k] === undefined ? '' : row[k];
        if (typeof val === 'object') {
          val = JSON.stringify(val);
        }
        val = String(val).replace(/"/g, '""');
        if (val.search(/("|,|\n)/g) >= 0) {
          val = `"${val}"`;
        }
        return val;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
