document.getElementById('input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const extractedDataWithNumbers = [];
    const extractedDataWithoutNumbers = [];
    
    reader.onload = function(e) {
        const content = e.target.result;
        const outputList = document.getElementById('output');
        outputList.innerHTML = "";

        // Add download buttons container
        const downloadContainer = document.createElement('div');
        downloadContainer.id = 'download-container';
        downloadContainer.style.margin = '20px auto';
        downloadContainer.style.maxWidth = '600px';
        downloadContainer.style.display = 'flex';
        downloadContainer.style.justifyContent = 'center';
        downloadContainer.style.flexWrap = 'wrap';
        downloadContainer.style.gap = '10px';
        outputList.parentNode.insertBefore(downloadContainer, outputList);

        if (file.name.endsWith('.csv')) {
            processCSV(content, outputList);
        } else {
            processText(content, outputList);
        }

        // Add download buttons if we have data
        if (extractedDataWithNumbers.length > 0 || extractedDataWithoutNumbers.length > 0) {
            createDownloadButtons(downloadContainer);
        }
    };

    reader.readAsText(file);

    function processText(text, outputList) {
        const phoneRegex = /(?:\+?[\s-]*(?:\d{1,3})?[\s-]*)?(?:\(\s*\d{3}\s*\)|\d{3})[\s-]*\d{3}[\s-]*\d{4}|\(\d{3}\)\s*\d{3}[\s-]*\d{4}|\d{3}[\s-.]\d{3}[\s-.]\d{4}|\d{10}/g;

        text.split(/\r?\n/).forEach(line => {
            const parts = line.split('\t');
            if (parts.length < 2) return;
            
            const link = parts[0].trim();
            const description = parts.slice(1).join('\t');

            processEntry(link, description, phoneRegex, outputList);
        });
    }

    function processCSV(csv, outputList) {
        const phoneRegex = /(?:\+?[\s-]*(?:\d{1,3})?[\s-]*)?(?:\(\s*\d{3}\s*\)|\d{3})[\s-]*\d{3}[\s-]*\d{4}|\(\d{3}\)\s*\d{3}[\s-]*\d{4}|\d{3}[\s-.]\d{3}[\s-.]\d{4}|\d{10}/g;
        
        const lines = csv.split(/\r?\n/);
        lines.forEach(line => {
            const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
            if (parts.length < 2) return;
            
            const link = parts[0].trim().replace(/^"|"$/g, '');
            const description = parts.slice(1).join(',').replace(/^"|"$/g, '');

            processEntry(link, description, phoneRegex, outputList);
        });
    }

    function processEntry(link, description, phoneRegex, outputList) {
        if (!link) return;

        const cleanDesc = description
            .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, ' ')
            .replace(/[‐‑‒–—―−]/g, '-')
            .replace(/(\d)\s+(\d)/g, '$1$2');

        const matches = cleanDesc.match(phoneRegex) || [];
        const validNumbers = [...new Set(
            matches.map(num => {
                const cleanNum = num.replace(/(?!^\+)\D/g, '');
                return cleanNum.length >= 10 ? cleanNum : null;
            }).filter(Boolean)
        )];

        const entry = {
            link: link,
            description: description,
            hasNumbers: validNumbers.length > 0,
            numbers: validNumbers.join(", ")
        };

        if (entry.hasNumbers) {
            extractedDataWithNumbers.push(entry);
            const listItem = document.createElement("li");
            listItem.innerHTML = `<a href="${link}" target="_blank">${link}</a> - ${entry.numbers}`;
            outputList.appendChild(listItem);
        } else {
            extractedDataWithoutNumbers.push(entry);
        }
    }

    function createDownloadButtons(container) {
        container.innerHTML = '';
        
        // Original download buttons (just entries with numbers)
        if (extractedDataWithNumbers.length > 0) {
            const txtBtn = createButton('Download New Data (TXT)', '#007BFF', () => 
                downloadNumbersOnly('txt', extractedDataWithNumbers, 'extracted-numbers')
            );
            
            const csvBtn = createButton('Download New Data (CSV)', '#28a745', () => 
                downloadNumbersOnly('csv', extractedDataWithNumbers, 'extracted-numbers')
            );
            
            container.appendChild(txtBtn);
            container.appendChild(csvBtn);
        }

        // New bonus button (all entries)
        if (extractedDataWithNumbers.length > 0 || extractedDataWithoutNumbers.length > 0) {
            const allDataBtn = createButton('Download All Data (CSV)', '#6f42c1', () => {
                const allData = [...extractedDataWithNumbers, ...extractedDataWithoutNumbers];
                downloadNumbersOnly('csv', allData, 'extracted-all-data');
            });
            
            // Add some space between button groups
            const spacer = document.createElement('div');
            spacer.style.width = '100%';
            spacer.style.height = '10px';
            container.appendChild(spacer);
            
            container.appendChild(allDataBtn);
        }
    }

    function createButton(text, color, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.margin = '0 5px';
        btn.style.padding = '8px 16px';
        btn.style.backgroundColor = color;
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.onclick = onClick;
        return btn;
    }

    function downloadNumbersOnly(format, data, filenamePrefix) {
        let content = '';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        if (format === 'txt') {
            content = data.map(item => 
                `${item.link}\t${item.hasNumbers ? item.numbers : 'PLEASE CHECK FOR NUMBER MANUALLY. WE COULDN\'T FIND ONE'}`
            ).join('\n');
            
            downloadFile(`${filenamePrefix}-${timestamp}.txt`, content);
        } 
        else if (format === 'csv') {
            // CSV header
            content = 'URL,Phone Numbers\n';
            
            // CSV content (only link and numbers)
            content += data.map(item => 
                `"${item.link.replace(/"/g, '""')}","${item.hasNumbers ? item.numbers.replace(/"/g, '""') : 'PLEASE CHECK FOR NUMBER MANUALLY. WE COULDN\'T FIND ONE'}"`
            ).join('\n');
            
            downloadFile(`${filenamePrefix}-${timestamp}.csv`, content);
        }
    }

    function downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});