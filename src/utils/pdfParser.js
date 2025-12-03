import * as pdfjsLib from 'pdfjs-dist';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractTextFromPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Sort items by Y (descending) then X (ascending)
        // Use a tolerance for Y to group items on the "same line"
        const items = textContent.items.sort((a, b) => {
            const y1 = a.transform[5];
            const y2 = b.transform[5];
            const yDiff = y2 - y1;

            if (Math.abs(yDiff) > 5) { // 5 units tolerance for line height
                return yDiff; // Different lines
            }
            return a.transform[4] - b.transform[4]; // Same line, sort by X
        });

        let lastY, text = '';
        for (const item of items) {
            if (!lastY || Math.abs(item.transform[5] - lastY) < 5) {
                text += item.str + ' ';
            }
            else {
                text += '\n' + item.str + ' ';
            }
            lastY = item.transform[5];
        }
        fullText += text + '\n';
    }

    return fullText;
}
