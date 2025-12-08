import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = 'https://api.bluelytics.com.ar/v2/evolution.json';
const outputPath = path.join(__dirname, '../src/data/historicalRates.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const allRates = JSON.parse(data);

            // Filter for Blue dollar and format
            const blueRates = allRates
                .filter(r => r.source === 'Blue')
                .map(r => ({
                    date: r.date,
                    rate: r.value_sell, // Use selling price
                    currency: 'USD'
                }))
                .sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

            fs.writeFileSync(outputPath, JSON.stringify(blueRates, null, 2));
            console.log(`Successfully saved ${blueRates.length} historical rates to ${outputPath}`);
        } catch (e) {
            console.error("Error parsing or saving data:", e);
            process.exit(1);
        }
    });

}).on('error', (err) => {
    console.error("Error fetching data:", err);
    process.exit(1);
});
