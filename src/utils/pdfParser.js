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
        const items = textContent.items.sort((a, b) => {
            const y1 = a.transform[5];
            const y2 = b.transform[5];
            const yDiff = y2 - y1;

            if (Math.abs(yDiff) > 5) { // 5 units tolerance
                return yDiff; // Different lines
            }
            return a.transform[4] - b.transform[4]; // Same line, sort by X
        });

        let lastY;
        let text = '';

        // Improved logic:
        // We want to preserve visual structure but also allow "reading ahead" for context.
        // The previous logic added \n for every new Y line.
        // The user wants "renglones subsiguientes" (subsequent lines) to be associated.
        // Standard PDF parsing usually just dumps text line by line.
        // The *Parser* (Regex/AI) is responsible for looking at multiple lines.
        // However, if we output:
        // "Transferencia a"
        // "Juan Perez"
        // The regex might miss it if it only looks at one line.
        // BUT, if we ensure the output text is clean with \n, the AI parser can see it.
        // The issue might be that the *previous* parser logic split by \n and processed line-by-line.
        // If we want to support multi-line, we should ensure the text extraction is clean.
        // Let's stick to clean line separation here. The *Parser* logic (in parserFactory/regexParser) needs to handle multi-line lookahead.

        // Wait, the user said "En el análisis de PDFs...".
        // If I change this to just dump text, it might break existing parsers.
        // Let's ensure we group items on the same visual line correctly (already done).
        // And ensure we output \n for new lines.

        for (const item of items) {
            if (!lastY || Math.abs(item.transform[5] - lastY) < 5) {
                text += item.str + ' '; // Same line
            }
            else {
                text += '\n' + item.str + ' '; // New line
            }
            lastY = item.transform[5];
        }
        fullText += text + '\n';
    }

    return fullText;
}
