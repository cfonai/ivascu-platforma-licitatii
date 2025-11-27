import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { RFQ, CreateRFQData, ApiError } from '../types';

export default function RFQsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteRFQId, setDeleteRFQId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateRFQData>({
    title: '',
    description: '',
    requirements: '',
    deadline: '',
    budget: undefined,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch RFQs
  const fetchRFQs = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ rfqs: RFQ[] }>('/rfqs');
      setRFQs(response.data.rfqs);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQs();
  }, [user]); // Refetch when user changes

  // Create RFQ (Client only)
  const handleCreateRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      // Convert date to ISO datetime string (set time to end of day)
      const deadlineDate = new Date(formData.deadline);
      deadlineDate.setHours(23, 59, 59, 999);

      const dataToSend = {
        ...formData,
        deadline: deadlineDate.toISOString(),
      };

      await api.post('/rfqs', dataToSend);
      setShowCreateModal(false);
      setFormData({ title: '', description: '', requirements: '', deadline: '', budget: undefined });
      fetchRFQs();
    } catch (error) {
      const apiError = error as ApiError;
      setFormError(apiError.error || 'Eroare la crearea cererii RFQ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Publish RFQ (Admin only)
  const handlePublishRFQ = async (id: string) => {
    try {
      await api.patch(`/rfqs/${id}/publish`);
      fetchRFQs();
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.error || 'Eroare la publicarea cererii RFQ');
    }
  };

  // Delete RFQ
  const handleDeleteRFQ = async () => {
    if (!deleteRFQId) return;

    try {
      await api.delete(`/rfqs/${deleteRFQId}`);
      setDeleteRFQId(null);
      fetchRFQs();
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.error || 'Eroare la ștergerea cererii RFQ');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'published':
        return 'bg-blue-100 text-blue-700';
      case 'offers_received':
        return 'bg-green-100 text-green-700';
      case 'negotiation':
        return 'bg-purple-100 text-purple-700';
      case 'final_offer_selected':
        return 'bg-yellow-100 text-yellow-700';
      case 'sent_to_client':
        return 'bg-indigo-100 text-indigo-700';
      case 'closed':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'published':
        return 'Publicat';
      case 'offers_received':
        return 'Oferte primite';
      case 'negotiation':
        return 'Negociere';
      case 'final_offer_selected':
        return 'Ofertă finală';
      case 'sent_to_client':
        return 'Trimis la client';
      case 'closed':
        return 'Închis';
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
              Cereri RFQ
            </h1>
            {user?.role === 'client' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-gradient btn-gradient-success"
              >
                + Crează Cerere RFQ
              </button>
            )}
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
            <button className="px-4 py-2 text-primary-600 border-b-2 border-primary-600 font-medium">
              Cereri RFQ
            </button>
            <button
              onClick={() => navigate('/orders')}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
              Comenzi
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600">Se încarcă cererile RFQ...</p>
            </div>
          ) : (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">
                {user?.role === 'client' && 'Cererile Mele RFQ'}
                {user?.role === 'supplier' && 'Cereri RFQ Disponibile'}
                {user?.role === 'admin' && 'Toate Cererile RFQ'}
                {' '}({rfqs.length})
              </h2>

              {rfqs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {user?.role === 'client' && 'Nu ai creat încă nicio cerere RFQ'}
                  {user?.role === 'supplier' && 'Nu există cereri RFQ publicate momentan'}
                  {user?.role === 'admin' && 'Nu există cereri RFQ în sistem'}
                </p>
              ) : (
                <div className="space-y-4">
                  {rfqs.map((rfq) => (
                    <div
                      key={rfq.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/rfqs/${rfq.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{rfq.title}</h3>
                            <span className={`status-badge ${getStatusBadgeColor(rfq.status)}`}>
                              {getStatusName(rfq.status)}
                            </span>
                            {rfq._count && rfq._count.offers > 0 && (
                              <span className="text-sm text-gray-600">
                                {rfq._count.offers} ofert{rfq._count.offers === 1 ? 'ă' : 'e'}
                              </span>
                            )}
                          </div>

                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{rfq.description}</p>

                          <div className="flex gap-4 text-sm text-gray-500">
                            <span>📅 Deadline: {new Date(rfq.deadline).toLocaleDateString('ro-RO')}</span>
                            {rfq.budget && <span>💰 Buget: {rfq.budget.toLocaleString('ro-RO')} RON</span>}
                            {rfq.client && user?.role === 'admin' && (
                              <span>👤 Client: {rfq.client.username}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          {user?.role === 'admin' && rfq.status === 'draft' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePublishRFQ(rfq.id);
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Publică
                            </button>
                          )}
                          {((user?.role === 'client' && rfq.clientId === user.id) || user?.role === 'admin') &&
                            rfq.status === 'draft' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteRFQId(rfq.id);
                                }}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                              >
                                Șterge
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create RFQ Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-xl font-bold mb-4">Crează Cerere RFQ Nouă</h3>

            <form onSubmit={handleCreateRFQ} className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titlu *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  minLength={3}
                  placeholder="Ex: Cerere echipament IT"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Minim 3 caractere</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descriere *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  required
                  minLength={10}
                  placeholder="Descrieți în detaliu cererea..."
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Minim 10 caractere</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cerințe *
                </label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  required
                  minLength={10}
                  placeholder="Specificați cerințele tehnice și cantități..."
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Minim 10 caractere</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data limită *
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Selectați data limită pentru oferte</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buget (opțional, RON)</label>
                <input
                  type="number"
                  value={formData.budget || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormError('');
                    setFormData({ title: '', description: '', requirements: '', deadline: '', budget: undefined });
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-gradient btn-gradient-success disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Se creează...' : 'Crează'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRFQId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Confirmare Ștergere</h3>
            <p className="text-gray-600 mb-6">
              Ești sigur că vrei să ștergi această cerere RFQ? Această acțiune nu poate fi anulată.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteRFQId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button onClick={handleDeleteRFQ} className="flex-1 btn-gradient btn-gradient-danger">
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
