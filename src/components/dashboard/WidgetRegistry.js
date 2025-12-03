import CategoryChart from './CategoryChart';
import OwnerChart from './OwnerChart';
import PaymentMethodChart from './PaymentMethodChart';
import TopExpensesChart from './TopExpensesChart';
import MonthlyFlowChart from './MonthlyFlowChart';

export const AVAILABLE_WIDGETS = [
    {
        id: 'category_chart',
        title: 'Gastos por Categoría',
        component: CategoryChart,
        defaultSize: { w: 1, h: 1 }, // 1x1 unit
        description: 'Gráfico de torta con apertura por categorías y subcategorías.'
    },
    {
        id: 'owner_chart',
        title: 'Gastos por Dueño',
        component: OwnerChart,
        defaultSize: { w: 1, h: 1 },
        description: 'Comparativa de gastos entre los dueños registrados.'
    },
    {
        id: 'payment_method_chart',
        title: 'Gastos por Medio de Pago',
        component: PaymentMethodChart,
        defaultSize: { w: 1, h: 1 },
        description: 'Distribución de gastos según el método de pago.'
    },
    {
        id: 'top_expenses_chart',
        title: 'Top 10 Gastos',
        component: TopExpensesChart,
        defaultSize: { w: 1, h: 1 },
        description: 'Ranking de las categorías o subcategorías con mayor gasto.'
    },
    {
        id: 'monthly_flow_chart',
        title: 'Evolución Mensual',
        component: MonthlyFlowChart,
        defaultSize: { w: 2, h: 1 }, // Wider
        description: 'Comparativa de ingresos vs egresos a lo largo del tiempo.'
    }
];
