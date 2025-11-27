import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Order } from '../types';

export default function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ orders: Order[] }>('/orders');
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
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

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Se încarcă comenzile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
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
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
