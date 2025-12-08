export const CurrencyService = {
    async fetchCurrentRates() {
        try {
            // Fetch Dolar Oficial
            const responseOficial = await fetch('https://dolarapi.com/v1/dolares/oficial');
            if (!responseOficial.ok) throw new Error('Failed to fetch Dolar Oficial');
            const dataOficial = await responseOficial.json();

            // Fetch Dolar Blue (just in case we want to store it too, or for comparison)
            const responseBlue = await fetch('https://dolarapi.com/v1/dolares/blue');
            if (!responseBlue.ok) throw new Error('Failed to fetch Dolar Blue');
            const dataBlue = await responseBlue.json();

            return {
                oficial: {
                    buy: dataOficial.compra,
                    sell: dataOficial.venta,
                    date: dataOficial.fechaActualizacion
                },
                blue: {
                    buy: dataBlue.compra,
                    sell: dataBlue.venta,
                    date: dataBlue.fechaActualizacion
                }
            };
        } catch (error) {
            console.error("CurrencyService Error:", error);
            return null;
        }
    }
};
