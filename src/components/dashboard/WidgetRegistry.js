import FinPilotWidget from './FinPilotWidget';
import CategoryChart from './CategoryChart';
import MemberChart from './MemberChart';
import PaymentMethodChart from './PaymentMethodChart';
import TopExpensesChart from './TopExpensesChart';
import MonthlyFlowChart from './MonthlyFlowChart';
import AccountsWidget from '../AccountsWidget';
import SubscriptionsWidget from './SubscriptionsWidget';
import PredictiveInsightsWidget from './PredictiveInsightsWidget';

export const AVAILABLE_WIDGETS = [
    {
        id: 'accounts_summary',
        title: 'Resumen de Gastos',
        component: AccountsWidget,
        defaultSize: { w: 2, h: 1 },
        minColSpan: 1,
        maxColSpan: 3,
        description: 'Resumen total y desglose por usuario.'
    },
    {
        id: 'finpilot_suggestions',
        title: 'Sugerencias FinPilot',
        component: FinPilotWidget,
        defaultSize: { w: 1, h: 1 },
        minColSpan: 1,
        maxColSpan: 2,
        description: 'Insights inteligentes sobre tus gastos y suscripciones.'
    },
    {
        id: 'category_chart',
        title: 'Gastos por Categoría',
        component: CategoryChart,
        defaultSize: { w: 2, h: 1 }, // Wider for better readability
        minColSpan: 2,
        maxColSpan: 3,
        description: 'Gráfico de torta con apertura por categorías y subcategorías.'
    },
    {
        id: 'owner_chart', // Keep ID for backward compatibility
        title: 'Gastos por Usuario',
        component: MemberChart,
        defaultSize: { w: 1, h: 1 },
        minColSpan: 1,
        maxColSpan: 2,
        description: 'Comparativa de gastos entre los usuarios registrados.'
    },
    {
        id: 'payment_method_chart',
        title: 'Gastos por Medio de Pago',
        component: PaymentMethodChart,
        defaultSize: { w: 1, h: 1 },
        minColSpan: 1,
        maxColSpan: 2,
        description: 'Distribución de gastos según el método de pago.'
    },
    {
        id: 'top_expenses_chart',
        title: 'Top 10 Gastos',
        component: TopExpensesChart,
        defaultSize: { w: 1, h: 1 },
        minColSpan: 1,
        maxColSpan: 3,
        description: 'Ranking de las categorías o subcategorías con mayor gasto.'
    },
    {
        id: 'monthly_flow_chart',
        title: 'Evolución Mensual',
        component: MonthlyFlowChart,
        defaultSize: { w: 2, h: 1 }, // Wider
        minColSpan: 2,
        maxColSpan: 3,
        description: 'Comparativa de ingresos vs egresos a lo largo del tiempo.'
    },
    {
        id: 'subscriptions',
        title: 'Suscripciones',
        component: SubscriptionsWidget,
        defaultSize: { w: 1, h: 1 },
        minColSpan: 1,
        maxColSpan: 2,
        description: 'Gastos recurrentes y próximas renovaciones.'
    },
    {
        id: 'predictive_insights',
        title: 'Análisis Predictivo',
        component: PredictiveInsightsWidget,
        defaultSize: { w: 2, h: 2 },
        minColSpan: 2,
        maxColSpan: 3,
        description: 'Proyecciones, anomalías y sugerencias de ahorro basadas en IA.'
    }
];
