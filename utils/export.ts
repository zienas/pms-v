// A simple utility to convert an array of objects to a CSV string and trigger a download.
export const downloadCSV = (data: any[], filename: string): void => {
    if (!data || data.length === 0) {
        alert("No data to export.");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')]; // Header row

    // Data rows
    data.forEach(item => {
        const values = headers.map(header => {
            let value = item[header];
            if (value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'string' && value.includes(',')) {
                // Handle commas within values by quoting the string
                value = `"${value}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
