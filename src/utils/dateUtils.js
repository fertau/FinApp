export const getStartOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const getEndOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

export const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

export const getEndOfWeek = (date) => {
    const d = getStartOfWeek(date);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
};

export const getStartOfQuarter = (date) => {
    const d = new Date(date);
    const quarter = Math.floor(d.getMonth() / 3);
    d.setMonth(quarter * 3);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

export const getEndOfQuarter = (date) => {
    const d = getStartOfQuarter(date);
    d.setMonth(d.getMonth() + 3);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
};

export const getStartOfYear = (date) => {
    return new Date(date.getFullYear(), 0, 1);
};

export const getEndOfYear = (date) => {
    return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
};

export const formatDateRange = (start, end, period) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };

    if (period === 'month') {
        return start.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    }
    if (period === 'year') {
        return start.getFullYear().toString();
    }

    return `${start.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`;
};
