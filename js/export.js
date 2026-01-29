/**
 * export.js
 * Utility to export data to CSV
 */
class ExportManager {
    static toCSV(filename, headers, data) {
        if (!data || !data.length) {
            alert('Tidak ada data untuk diexport.');
            return;
        }

        const csvRows = [];
        
        // Add Header
        csvRows.push(headers.join(','));

        // Add Data
        for (const row of data) {
            const values = headers.map(header => {
                const escaped = ('' + (row[header] || '')).replace(/"/g, '\\"');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${filename}.csv`);
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

window.ExportManager = ExportManager;
