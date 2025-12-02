import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../lib/api';

interface EarningsStatistics {
  period: string;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    avgOrderValue: number;
    avgCommissionRate: number;
  };
  rfqStats: {
    total: number;
    published: number;
    closed: number;
    conversionRate: number;
  };
  offerStats: {
    total: number;
    accepted: number;
    acceptanceRate: number;
  };
  negotiationStats: {
    total: number;
    completed: number;
    successRate: number;
  };
  categoryBreakdown: Array<{
    category: string;
    count: number;
    revenue: number;
    commission: number;
  }>;
  topClients: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  topSuppliers: Array<{
    name: string;
    count: number;
    revenue: number;
    rating: number;
  }>;
  earningsTrend: Array<{
    date: string;
    revenue: number;
    commission: number;
    orders: number;
  }>;
}

export default function StatisticsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('month');
  const [statistics, setStatistics] = useState<EarningsStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchStatistics();
  }, [period]);

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<EarningsStatistics>(`/statistics/earnings?period=${period}`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value) + ' RON';
  };

  const formatPercentage = (value: number) => {
    return value.toFixed(1) + '%';
  };

  const getPeriodLabel = (p: string) => {
    const labels: Record<string, string> = {
      today: 'Astazi',
      week: 'Saptamana Aceasta',
      month: 'Luna Aceasta',
      year: 'Anul Acesta',
      all: 'Toate Timpurile'
    };
    return labels[p] || p;
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Platforma Licitatii
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Deconecteaza-te
            </button>
          </div>

          <nav className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/users')}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
              Utilizatori
            </button>
            <button
              onClick={() => navigate('/rfqs')}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
              Cereri RFQ
            </button>
            <button
              onClick={() => navigate('/admin/oferte-respinse')}
              className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors font-medium"
            >
              Respinse Automat
            </button>
            <button
              onClick={() => navigate('/orders')}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
              Comenzi
            </button>
            <button
              onClick={() => navigate('/archive')}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
              Arhiva
            </button>
            <button
              onClick={() => navigate('/statistics')}
              className="px-4 py-2 text-primary-600 border-b-2 border-primary-600 font-medium"
            >
              Statistici
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Statistici si Venituri</h2>

            <div className="flex gap-2 flex-wrap">
              {(['today', 'week', 'month', 'year', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    period === p
                      ? 'bg-gradient-primary text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {getPeriodLabel(p)}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Se incarca statisticile...</div>
            </div>
          ) : !statistics ? (
            <div className="text-center py-12">
              <div className="text-red-500">Eroare la incarcarea statisticilor</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card bg-gradient-primary text-white">
                  <div className="text-sm opacity-90 mb-1">Comision Total</div>
                  <div className="text-3xl font-bold mb-1">
                    {formatCurrency(statistics.summary.totalCommission)}
                  </div>
                  <div className="text-xs opacity-75">
                    {formatPercentage(statistics.summary.avgCommissionRate)} rata medie
                  </div>
                </div>

                <div className="card bg-gradient-success text-white">
                  <div className="text-sm opacity-90 mb-1">Vanzari Totale</div>
                  <div className="text-3xl font-bold mb-1">
                    {formatCurrency(statistics.summary.totalRevenue)}
                  </div>
                  <div className="text-xs opacity-75">
                    {statistics.summary.totalOrders} comenzi finalizate
                  </div>
                </div>

                <div className="card bg-gradient-warning text-white">
                  <div className="text-sm opacity-90 mb-1">Valoare Medie Comanda</div>
                  <div className="text-3xl font-bold mb-1">
                    {formatCurrency(statistics.summary.avgOrderValue)}
                  </div>
                  <div className="text-xs opacity-75">
                    per comanda finalizata
                  </div>
                </div>

                <div className="card bg-gradient-to-br from-purple-500 to-purple-700 text-white">
                  <div className="text-sm opacity-90 mb-1">Conversie RFQ - Comanda</div>
                  <div className="text-3xl font-bold mb-1">
                    {formatPercentage(statistics.rfqStats.conversionRate)}
                  </div>
                  <div className="text-xs opacity-75">
                    {statistics.rfqStats.closed} din {statistics.rfqStats.total} RFQ-uri
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">RFQ-uri</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total</span>
                      <span className="font-bold text-gray-900">{statistics.rfqStats.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Publicate</span>
                      <span className="font-bold text-blue-600">{statistics.rfqStats.published}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Finalizate</span>
                      <span className="font-bold text-green-600">{statistics.rfqStats.closed}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-gray-700 font-medium">Rata conversie</span>
                      <span className="font-bold text-purple-600">
                        {formatPercentage(statistics.rfqStats.conversionRate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Oferte</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total primite</span>
                      <span className="font-bold text-gray-900">{statistics.offerStats.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Acceptate</span>
                      <span className="font-bold text-green-600">{statistics.offerStats.accepted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Respinse</span>
                      <span className="font-bold text-red-600">
                        {statistics.offerStats.total - statistics.offerStats.accepted}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-gray-700 font-medium">Rata acceptare</span>
                      <span className="font-bold text-green-600">
                        {formatPercentage(statistics.offerStats.acceptanceRate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Negocieri</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total initiate</span>
                      <span className="font-bold text-gray-900">{statistics.negotiationStats.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Finalizate</span>
                      <span className="font-bold text-green-600">{statistics.negotiationStats.completed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">In desfasurare</span>
                      <span className="font-bold text-blue-600">
                        {statistics.negotiationStats.total - statistics.negotiationStats.completed}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-gray-700 font-medium">Rata succes</span>
                      <span className="font-bold text-green-600">
                        {formatPercentage(statistics.negotiationStats.successRate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {statistics.earningsTrend.length > 0 && (
                <div className="card mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Evolutie Venituri</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-4 text-gray-600 font-medium">Perioada</th>
                          <th className="text-right py-2 px-4 text-gray-600 font-medium">Comenzi</th>
                          <th className="text-right py-2 px-4 text-gray-600 font-medium">Vanzari</th>
                          <th className="text-right py-2 px-4 text-gray-600 font-medium">Comision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statistics.earningsTrend.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-900">{item.date}</td>
                            <td className="py-3 px-4 text-right text-gray-700">{item.orders}</td>
                            <td className="py-3 px-4 text-right text-gray-900 font-medium">
                              {formatCurrency(item.revenue)}
                            </td>
                            <td className="py-3 px-4 text-right text-green-600 font-bold">
                              {formatCurrency(item.commission)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {statistics.categoryBreakdown.length > 0 && (
                <div className="card mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Venituri pe Categorie</h3>
                  <div className="space-y-3">
                    {statistics.categoryBreakdown.map((cat, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{cat.category}</div>
                          <div className="text-sm text-gray-600">{cat.count} comenzi</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{formatCurrency(cat.revenue)}</div>
                          <div className="text-sm text-green-600 font-medium">
                            {formatCurrency(cat.commission)} comision
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {statistics.topClients.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Top Clienti</h3>
                    <div className="space-y-3">
                      {statistics.topClients.map((client, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-400 w-8">
                            {index + 1}.
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{client.name}</div>
                            <div className="text-sm text-gray-600">{client.count} comenzi</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">{formatCurrency(client.revenue)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {statistics.topSuppliers.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Top Furnizori</h3>
                    <div className="space-y-3">
                      {statistics.topSuppliers.map((supplier, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-400 w-8">
                            {index + 1}.
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{supplier.name}</div>
                            <div className="text-sm text-gray-600">
                              {supplier.count} comenzi - {supplier.rating.toFixed(1)} rating
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">{formatCurrency(supplier.revenue)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
