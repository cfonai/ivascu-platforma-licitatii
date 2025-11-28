import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Order } from '../types';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ order: Order }>(`/orders/${id}`);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Error fetching order:', error);
      alert('Eroare la încărcarea comenzii');
      navigate('/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePayment = async (status: 'initiated' | 'confirmed') => {
    try {
      await api.patch(`/orders/${id}/payment`, { status });
      const message = status === 'initiated'
        ? '✅ Plata a fost inițiată cu succes'
        : '✅ Plata a fost confirmată cu succes';
      alert(message);
      fetchOrder();
    } catch (error: any) {
      alert('❌ ' + (error.response?.data?.error || 'Eroare la actualizarea plății'));
    }
  };

  const handleUpdateDelivery = async (status: 'in_progress' | 'delivered' | 'received') => {
    try {
      await api.patch(`/orders/${id}/delivery`, { status });
      const statusMessages = {
        in_progress: '✅ Livrarea a fost începută',
        delivered: '✅ Comanda a fost marcată ca livrată',
        received: '✅ Primirea comenzii a fost confirmată'
      };
      alert(statusMessages[status]);
      fetchOrder();
    } catch (error: any) {
      alert('❌ ' + (error.response?.data?.error || 'Eroare la actualizarea livrării'));
    }
  };

  const handleFinalize = async () => {
    try {
      await api.patch(`/orders/${id}/finalize`);
      alert('✅ Comanda a fost finalizată cu succes');
      fetchOrder();
    } catch (error: any) {
      alert('❌ ' + (error.response?.data?.error || 'Eroare la finalizarea comenzii'));
    }
  };

  const handleArchive = async () => {
    try {
      await api.patch(`/orders/${id}/archive`);
      alert('✅ Comanda a fost arhivată cu succes');
      fetchOrder();
    } catch (error: any) {
      alert('❌ ' + (error.response?.data?.error || 'Eroare la arhivarea comenzii'));
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
            <p className="mt-4 text-gray-600">Se încarcă comanda...</p>
          </div>
        ) : !order ? (
          <div className="text-center py-12">
            <p className="text-red-600">Comanda nu a fost găsită</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/orders')}
              className="text-gray-600 hover:text-gray-900 mb-2 inline-flex items-center"
            >
              ← Înapoi la Comenzi
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Detalii Comandă</h1>
          </div>
          <div className="text-right">
            <span className={`status-badge ${getStatusBadgeColor(order.status)} text-lg px-4 py-2`}>
              {getStatusName(order.status)}
            </span>
            {order.isLocked && (
              <p className="text-red-600 text-sm mt-1">🔒 Comandă Blocată</p>
            )}
          </div>
        </div>

        {/* Order Info Card */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Informații Generale</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">RFQ</p>
              <p className="font-semibold text-gray-900">{order.rfq?.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Preț Final</p>
              <p className="text-2xl font-bold text-gray-900">{order.finalPrice.toLocaleString('ro-RO')} RON</p>
            </div>
            {(user?.role === 'admin' || user?.role === 'supplier') && (
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-semibold text-gray-900">{order.client?.username}</p>
                <p className="text-sm text-gray-600">{order.client?.email}</p>
              </div>
            )}
            {(user?.role === 'admin' || user?.role === 'client') && (
              <div>
                <p className="text-sm text-gray-500">Furnizor</p>
                <p className="font-semibold text-gray-900">{order.supplier?.username}</p>
                <p className="text-sm text-gray-600">{order.supplier?.email}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Data Creării</p>
              <p className="font-semibold text-gray-900">{new Date(order.createdAt).toLocaleString('ro-RO')}</p>
            </div>
            {order.finalizedAt && (
              <div>
                <p className="text-sm text-gray-500">Data Finalizării</p>
                <p className="font-semibold text-gray-900">{new Date(order.finalizedAt).toLocaleString('ro-RO')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Offer Details */}
        {order.offer && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Detalii Ofertă</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Descriere</p>
                <p className="text-gray-900">{order.offer.description}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Timp de Livrare</p>
                <p className="text-gray-900">{order.offer.deliveryTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Termeni Finali</p>
                <p className="text-gray-900 whitespace-pre-wrap">{order.finalTerms}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Section */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">💳 Plată (Mock)</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Status Plată</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {order.paymentMockStatus === 'pending' && '⏳ În așteptare'}
                {order.paymentMockStatus === 'initiated' && '🔄 Inițiată'}
                {order.paymentMockStatus === 'confirmed' && '✅ Confirmată'}
              </p>
            </div>
            {user?.role === 'admin' && order.status !== 'finalized' && order.status !== 'archived' && (
              <div className="flex gap-2">
                {order.paymentMockStatus === 'pending' && (
                  <button
                    onClick={() => handleUpdatePayment('initiated')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Inițiază Plata
                  </button>
                )}
                {order.paymentMockStatus === 'initiated' && (
                  <button
                    onClick={() => handleUpdatePayment('confirmed')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Confirmă Plata
                  </button>
                )}
              </div>
            )}
          </div>
          {user?.role !== 'admin' && (
            <p className="text-sm text-gray-600 italic">
              Doar administratorii pot actualiza statusul plății.
            </p>
          )}
        </div>

        {/* Delivery Section */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🚚 Livrare</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Status Livrare</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {order.deliveryStatus === 'pending' && '⏳ În așteptare'}
                {order.deliveryStatus === 'in_progress' && '🔄 În curs'}
                {order.deliveryStatus === 'delivered' && '📦 Livrată'}
                {order.deliveryStatus === 'received' && '✅ Primită'}
              </p>
            </div>
            <div className="flex gap-2">
              {/* Supplier/Admin can mark as in_progress */}
              {(user?.role === 'admin' || user?.role === 'supplier') &&
                order.deliveryStatus === 'pending' &&
                order.status !== 'finalized' &&
                order.status !== 'archived' && (
                  <button
                    onClick={() => handleUpdateDelivery('in_progress')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Începe Livrarea
                  </button>
                )}
              {/* Supplier/Admin can mark as delivered */}
              {(user?.role === 'admin' || user?.role === 'supplier') &&
                order.deliveryStatus === 'in_progress' &&
                order.status !== 'finalized' &&
                order.status !== 'archived' && (
                  <button
                    onClick={() => handleUpdateDelivery('delivered')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Marchează ca Livrată
                  </button>
                )}
              {/* Client/Admin can confirm receipt */}
              {(user?.role === 'admin' || user?.role === 'client') &&
                order.deliveryStatus === 'delivered' &&
                order.status !== 'finalized' &&
                order.status !== 'archived' && (
                  <button
                    onClick={() => handleUpdateDelivery('received')}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    Confirmă Primirea
                  </button>
                )}
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        {user?.role === 'admin' && (
          <div className="card bg-blue-50 border-2 border-blue-200">
            <h2 className="text-xl font-bold text-blue-900 mb-4">🔧 Acțiuni Administrator</h2>
            <div className="flex gap-3">
              {order.status === 'received' && (
                <button
                  onClick={handleFinalize}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  ✅ Finalizează Comanda
                </button>
              )}
              {order.status === 'finalized' && (
                <button
                  onClick={handleArchive}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                >
                  📁 Arhivează Comanda
                </button>
              )}
              {order.status !== 'received' && order.status !== 'finalized' && order.status !== 'archived' && (
                <p className="text-blue-800 italic">
                  Comanda trebuie să fie în status "Primită" pentru a putea fi finalizată.
                </p>
              )}
            </div>
          </div>
        )}
          </div>
        )}
      </main>
    </div>
  );
}
