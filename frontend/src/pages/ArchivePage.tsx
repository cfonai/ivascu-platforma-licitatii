import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Order } from '../types';

export default function ArchivePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchArchivedOrders();
  }, []);

  const fetchArchivedOrders = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ orders: Order[] }>('/orders');
      // Filter only archived orders
      const archivedOrders = response.data.orders.filter(order => order.status === 'archived');
      setOrders(archivedOrders);
    } catch (error) {
      console.error('Error fetching archived orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Platformă Licitații
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Deconectează-te
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
              Dashboard
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/users')}
                className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
              >
                Utilizatori
              </button>
            )}
            <button
              onClick={() => navigate('/rfqs')}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
              Cereri RFQ
            </button>
            <button
              onClick={() => navigate('/orders')}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
              Comenzi
            </button>
            <button className="px-4 py-2 text-primary-600 border-b-2 border-primary-600 font-medium">
              Arhivă
            </button>
            {user?.role === 'client' && (
              <button
                onClick={() => navigate('/supplier-map')}
                className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
              >
                Căutare Furnizor
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Se încarcă comenzile arhivate...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Comenzi Arhivate</h1>
              <div className="text-gray-600">
                <span className="font-semibold">{orders.length}</span> comenzi arhivate
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-gray-400 text-5xl mb-4">📁</div>
                <p className="text-gray-500 text-lg">Nu există comenzi arhivate.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="card hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {order.rfq?.title}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          {(user?.role === 'admin' || user?.role === 'supplier') && (
                            <p>
                              <span className="font-medium">Client:</span> {order.client?.username}
                            </p>
                          )}
                          {(user?.role === 'admin' || user?.role === 'client') && (
                            <p>
                              <span className="font-medium">Furnizor:</span> {order.supplier?.username}
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Data creării:</span>{' '}
                            {new Date(order.createdAt).toLocaleDateString('ro-RO')}
                          </p>
                          {order.finalizedAt && (
                            <p>
                              <span className="font-medium">Data finalizării:</span>{' '}
                              {new Date(order.finalizedAt).toLocaleDateString('ro-RO')}
                            </p>
                          )}
                          {order.archivedAt && (
                            <p>
                              <span className="font-medium">Data arhivării:</span>{' '}
                              {new Date(order.archivedAt).toLocaleDateString('ro-RO')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 mb-2">
                          {order.finalPrice.toLocaleString('ro-RO')} RON
                        </p>
                        <span className="status-badge bg-gray-100 text-gray-700">
                          📁 Arhivată
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 text-sm">
                      <div>
                        <span className="text-gray-500">Plată:</span>
                        <p className="font-medium text-gray-900">Confirmată</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Livrare:</span>
                        <p className="font-medium text-gray-900">Primită</p>
                      </div>
                      <div>
                        <span className="text-gray-500">ID Comandă:</span>
                        <p className="font-mono text-xs text-gray-700">
                          {order.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
