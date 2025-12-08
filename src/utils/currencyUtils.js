
export async function fetchExchangeRates() {
    try {
        const response = await fetch('https://dolarapi.com/v1/dolares');
        if (!response.ok) throw new Error('Failed to fetch rates');
        const data = await response.json();

        // Find "Blue" and "Oficial"
        const blue = data.find(d => d.casa === 'blue');
        const oficial = data.find(d => d.casa === 'oficial');

        return {
            blue: blue ? blue.venta : null,
            oficial: oficial ? oficial.venta : null,
            lastUpdated: new Date()
        };
    } catch (error) {
        console.error("Error fetching exchange rates:", error);
        return null;
    }
}

export const formatCurrency = (amount, currency, minimumFractionDigits = 2) => {
    if (currency === 'USD') {
        return `U$S ${Math.abs(amount).toLocaleString('es-AR', { minimumFractionDigits, maximumFractionDigits: minimumFractionDigits })}`;
    }
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits,
        maximumFractionDigits: minimumFractionDigits
    }).format(Math.abs(amount));
};
