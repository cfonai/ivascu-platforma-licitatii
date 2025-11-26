import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { RFQ, Offer, CreateOfferData, ApiError } from '../types';

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rfq, setRFQ] = useState<RFQ | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [deleteOfferId, setDeleteOfferId] = useState<string | null>(null);

  // Offer form state
  const [offerForm, setOfferForm] = useState<CreateOfferData>({
    rfqId: id || '',
    price: 0,
    deliveryTime: '',
    description: '',
    terms: '',
  });
  const [offerFormError, setOfferFormError] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  // Check if supplier already submitted an offer
  const hasSubmittedOffer = offers.some(offer => offer.supplierId === user?.id);

  // Fetch RFQ details
  const fetchRFQ = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ rfq: RFQ }>(`/rfqs/${id}`);
      setRFQ(response.data.rfq);
    } catch (error) {
      console.error('Error fetching RFQ:', error);
      const apiError = error as ApiError;
      alert(apiError.error || 'Eroare la încărcarea cererii RFQ');
      navigate('/rfqs');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch offers for this RFQ
  const fetchOffers = async () => {
    try {
      const response = await api.get<{ offers: Offer[] }>(`/offers/rfq/${id}`);
      setOffers(response.data.offers);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRFQ();
      fetchOffers();
    }
  }, [id, user]);

  // Submit offer (Supplier only)
  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfferFormError('');
    setIsSubmittingOffer(true);

    try {
      await api.post('/offers', offerForm);
      setShowOfferModal(false);
      setOfferForm({
        rfqId: id || '',
        price: 0,
        deliveryTime: '',
        description: '',
        terms: '',
      });
      fetchOffers();
      fetchRFQ(); // Refresh to update status
    } catch (error) {
      const apiError = error as ApiError;
      setOfferFormError(apiError.error || 'Eroare la depunerea ofertei');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // Delete offer
  const handleDeleteOffer = async () => {
    if (!deleteOfferId) return;

    try {
      await api.delete(`/offers/${deleteOfferId}`);
      setDeleteOfferId(null);
      fetchOffers();
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.error || 'Eroare la ștergerea ofertei');
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
      case 'submitted':
        return 'bg-green-100 text-green-700';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700';
      case 'in_negotiation':
        return 'bg-purple-100 text-purple-700';
      case 'accepted':
        return 'bg-green-100 text-green-700';
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
      case 'submitted':
        return 'Depusă';
      case 'under_review':
        return 'În revizuire';
      case 'in_negotiation':
        return 'Negociere';
      case 'accepted':
        return 'Acceptată';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!rfq) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <button
                onClick={() => navigate('/rfqs')}
                className="text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-2"
              >
                ← Înapoi la cereri
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{rfq.title}</h1>
            </div>
            <span className={`status-badge ${getStatusBadgeColor(rfq.status)}`}>
              {getStatusName(rfq.status)}
            </span>
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
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* RFQ Details */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Detalii Cerere</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Descriere</label>
                <p className="text-gray-900 mt-1">{rfq.description}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Cerințe</label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{rfq.requirements}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-600">Data limită</label>
                  <p className="text-gray-900 mt-1">
                    {new Date(rfq.deadline).toLocaleDateString('ro-RO')}
                  </p>
                </div>

                {rfq.budget && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Buget</label>
                    <p className="text-gray-900 mt-1">{rfq.budget.toLocaleString('ro-RO')} RON</p>
                  </div>
                )}

                {rfq.client && user?.role === 'admin' && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Client</label>
                    <p className="text-gray-900 mt-1">{rfq.client.username}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Supplier: Submit Offer */}
          {user?.role === 'supplier' && (rfq.status === 'published' || rfq.status === 'offers_received') && !hasSubmittedOffer && (
            <div className="card bg-gradient-warning text-white">
              <h3 className="text-xl font-bold mb-3">Depune Ofertă</h3>
              <p className="mb-4 opacity-90">
                Poți depune o ofertă pentru această cerere RFQ. Asigură-te că incluzi toate detaliile necesare.
              </p>
              <button
                onClick={() => setShowOfferModal(true)}
                className="px-6 py-2.5 bg-white text-orange-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Depune Ofertă
              </button>
            </div>
          )}

          {/* Offers Section */}
          {offers.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">
                Oferte Depuse ({offers.length})
              </h2>

              <div className="space-y-4">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        {offer.supplier && (user?.role === 'admin' || user?.role === 'client') && (
                          <p className="font-semibold text-gray-900">
                            Furnizor: {offer.supplier.username}
                          </p>
                        )}
                        <span className={`status-badge ${getStatusBadgeColor(offer.status)} mt-2`}>
                          {getStatusName(offer.status)}
                        </span>
                        {offer.isLocked && (
                          <span className="ml-2 text-red-600 text-sm">🔒 Blocat</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {offer.price.toLocaleString('ro-RO')} RON
                        </p>
                        <p className="text-sm text-gray-600">
                          Livrare: {offer.deliveryTime}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Descriere:</span>
                        <p className="text-gray-600 mt-1">{offer.description}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Termeni:</span>
                        <p className="text-gray-600 mt-1">{offer.terms}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500">
                        Depusă la: {new Date(offer.submittedAt).toLocaleString('ro-RO')}
                      </p>
                      {((user?.role === 'supplier' && offer.supplierId === user.id) || user?.role === 'admin') &&
                        !offer.isLocked &&
                        offer.status === 'submitted' && (
                          <button
                            onClick={() => setDeleteOfferId(offer.id)}
                            className="text-red-600 hover:text-red-800 text-sm transition-colors"
                          >
                            Șterge
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No offers message */}
          {offers.length === 0 && (user?.role === 'admin' || user?.role === 'client') && (
            <div className="card text-center py-8">
              <p className="text-gray-500">Nu au fost depuse oferte încă pentru această cerere RFQ.</p>
            </div>
          )}

          {/* Supplier already submitted */}
          {user?.role === 'supplier' && hasSubmittedOffer && (
            <div className="card bg-green-50 border-green-200">
              <p className="text-green-800">
                ✓ Ai depus deja o ofertă pentru această cerere RFQ.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Submit Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-xl font-bold mb-4">Depune Ofertă</h3>

            <form onSubmit={handleSubmitOffer} className="space-y-4">
              {offerFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {offerFormError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preț (RON) *
                </label>
                <input
                  type="number"
                  value={offerForm.price || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="Ex: 45000"
                  disabled={isSubmittingOffer}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timp de livrare *
                </label>
                <input
                  type="text"
                  value={offerForm.deliveryTime}
                  onChange={(e) => setOfferForm({ ...offerForm, deliveryTime: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  minLength={3}
                  placeholder="Ex: 2-3 săptămâni"
                  disabled={isSubmittingOffer}
                />
                <p className="text-xs text-gray-500 mt-1">Minim 3 caractere</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descriere ofertă *
                </label>
                <textarea
                  value={offerForm.description}
                  onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  required
                  minLength={10}
                  placeholder="Descrieți produsele/serviciile oferite..."
                  disabled={isSubmittingOffer}
                />
                <p className="text-xs text-gray-500 mt-1">Minim 10 caractere</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Termeni și condiții *
                </label>
                <textarea
                  value={offerForm.terms}
                  onChange={(e) => setOfferForm({ ...offerForm, terms: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  required
                  minLength={10}
                  placeholder="Specificați garanția, termeni de plată, etc..."
                  disabled={isSubmittingOffer}
                />
                <p className="text-xs text-gray-500 mt-1">Minim 10 caractere</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowOfferModal(false);
                    setOfferFormError('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmittingOffer}
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-gradient btn-gradient-warning disabled:opacity-50"
                  disabled={isSubmittingOffer}
                >
                  {isSubmittingOffer ? 'Se depune...' : 'Depune Ofertă'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteOfferId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Confirmare Ștergere</h3>
            <p className="text-gray-600 mb-6">
              Ești sigur că vrei să ștergi această ofertă? Această acțiune nu poate fi anulată.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteOfferId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button onClick={handleDeleteOffer} className="flex-1 btn-gradient btn-gradient-danger">
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
