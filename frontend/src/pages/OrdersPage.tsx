import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Order } from '../types';

export default function OrdersPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ orders: Order[] }>('/orders');
      // Filter out archived orders
      const activeOrders = response.data.orders.filter(order => order.status !== 'archived');
      setOrders(activeOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderId) return;

    try {
      await api.delete(`/orders/${deleteOrderId}`);
      alert('✅ Comanda a fost ștearsă cu succes');
      setDeleteOrderId(null);
      fetchOrders();
    } catch (error: any) {
      alert('❌ ' + (error.response?.data?.error || 'Eroare la ștergerea comenzii'));
      setDeleteOrderId(null);
    }
  };

  const canDeleteOrder = (order: Order) => {
    // Only admin can delete, and only orders in 'created' or 'payment_initiated' status
    const deletableStatuses = ['created', 'payment_initiated'];
    return user?.role === 'admin' && deletableStatuses.includes(order.status);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'created':
        return 'bg-blue-100 text-blue-700';
      case 'payment_initiated':
        return 'bg-yellow-100 text-yellow-700';
      case 'payment_confirmed':
        return 'bg-green-100 text-green-700';
      case 'delivery_in_progress':
        return 'bg-purple-100 text-purple-700';
      case 'delivered':
        return 'bg-indigo-100 text-indigo-700';
      case 'received':
        return 'bg-teal-100 text-teal-700';
      case 'finalized':
        return 'bg-green-200 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'created':
        return 'Creată';
      case 'payment_initiated':
        return 'Plată Inițiată';
      case 'payment_confirmed':
        return 'Plată Confirmată';
      case 'delivery_in_progress':
        return 'Livrare în Curs';
      case 'delivered':
        return 'Livrată';
      case 'received':
        return 'Primită';
      case 'finalized':
        return 'Finalizată';
      case 'archived':
        return 'Arhivată';
      default:
        return status;
    }
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
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin/oferte-respinse')}
                className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors font-medium"
              >
                🗑️ Respinse Automat
              </button>
            )}
            <button className="px-4 py-2 text-primary-600 border-b-2 border-primary-600 font-medium">
              Comenzi
            </button>
            <button
              onClick={() => navigate('/archive')}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
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
            <p className="mt-4 text-gray-600">Se încarcă comenzile...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Comenzi</h1>
            </div>

      {orders.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">Nu există comenzi.</p>
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
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {order.finalPrice.toLocaleString('ro-RO')} RON
                  </p>
                  <span className={`status-badge ${getStatusBadgeColor(order.status)}`}>
                    {getStatusName(order.status)}
                  </span>
                  {order.isLocked && (
                    <span className="block text-red-600 text-sm mt-1">🔒 Blocat</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 text-sm">
                <div>
                  <span className="text-gray-500">Plată:</span>
                  <p className="font-medium text-gray-900 capitalize">
                    {order.paymentMockStatus === 'pending' && 'În așteptare'}
                    {order.paymentMockStatus === 'initiated' && 'Inițiată'}
                    {order.paymentMockStatus === 'confirmed' && 'Confirmată'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Livrare:</span>
                  <p className="font-medium text-gray-900 capitalize">
                    {order.deliveryStatus === 'pending' && 'În așteptare'}
                    {order.deliveryStatus === 'in_progress' && 'În curs'}
                    {order.deliveryStatus === 'delivered' && 'Livrată'}
                    {order.deliveryStatus === 'received' && 'Primită'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">ID Comandă:</span>
                  <p className="font-mono text-xs text-gray-700">
                    {order.id.substring(0, 8)}...
                  </p>
                </div>
              </div>

              {canDeleteOrder(order) && (
                <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteOrderId(order.id);
                    }}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    Șterge Comandă
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
          </>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-red-600">⚠️ Confirmare Ștergere</h3>
            <p className="text-gray-600 mb-6">
              Ești sigur că vrei să ștergi această comandă? Această acțiune nu poate fi anulată.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteOrderId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleDeleteOrder}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
