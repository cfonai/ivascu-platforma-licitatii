import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Client {
  id: string;
  username: string;
  companyName?: string;
  reputationScore?: number;
  financialScore?: number;
  email: string;
}

interface RFQ {
  id: string;
  title: string;
  description: string;
  budget?: number;
  deadline: string;
  createdAt: string;
  autoProcessedAt?: string;
  aiDecisionReason?: string;
  aiConfidenceScore?: number;
  client: Client;
}

export default function AutoRejectedRFQsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    fetchAutoRejectedRFQs();
  }, []);

  const fetchAutoRejectedRFQs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/poc/gatekeeper/auto-rejected`, {
        withCredentials: true,
      });
      setRfqs(response.data.rfqs);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Eroare la încărcare');
      console.error('Eroare:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReEvaluate = async (rfqId: string) => {
    if (!confirm('Sigur vrei să re-evaluezi și să publici acest RFQ?')) return;

    setProcessing(true);
    try {
      await axios.post(
        `${API_URL}/api/poc/gatekeeper/re-evaluate/${rfqId}`,
        {},
        { withCredentials: true }
      );
      alert('✅ RFQ re-evaluat și publicat cu succes!');
      fetchAutoRejectedRFQs(); // Reîncarcă lista
      setSelectedRFQ(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Eroare la re-evaluare');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (rfqId: string) => {
    if (!confirm('Sigur vrei să ștergi definitiv acest RFQ? Acțiunea este ireversibilă.')) return;

    setProcessing(true);
    try {
      await axios.delete(`${API_URL}/api/poc/gatekeeper/delete-rejected/${rfqId}`, {
        withCredentials: true,
      });
      alert('✅ RFQ șters cu succes!');
      fetchAutoRejectedRFQs(); // Reîncarcă lista
      setSelectedRFQ(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Eroare la ștergere');
    } finally {
      setProcessing(false);
    }
  };

  const getDaysOld = (date: string) => {
    const rfqDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - rfqDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              🗑️ Oferte Respinse Automat
            </h1>
            <div className="flex gap-3">
              <button
                onClick={fetchAutoRejectedRFQs}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition"
              >
                🔄 Reîmprospătează
              </button>
              <button
                onClick={handleLogout}
                className="btn-gradient btn-gradient-primary"
              >
                Deconectare
              </button>
            </div>
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
              <button className="px-4 py-2 text-red-600 border-b-2 border-red-600 font-medium">
                🗑️ Respinse Automat
              </button>
            )}
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
              Arhivă
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-gray-600">
            RFQ-uri respinse automat de AI. Vor fi șterse automat după 7 zile.
          </p>
          {rfqs.length > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Notă: Aceste RFQ-uri au fost respinse automat de sistem bazat pe criteriile de eligibilitate.
                Poți re-evalua manual sau le poți șterge definitiv.
              </p>
            </div>
          )}
        </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {rfqs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Niciun RFQ respins</h3>
          <p className="text-gray-600">Nu există RFQ-uri respinse automat în acest moment.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {rfqs.map((rfq) => {
            const daysOld = getDaysOld(rfq.autoProcessedAt || rfq.createdAt);
            const willDeleteIn = 7 - daysOld;

            return (
              <div
                key={rfq.id}
                className="bg-white border-2 border-red-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{rfq.title}</h3>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-gray-600">
                          🏢 {rfq.client.companyName || rfq.client.username}
                        </span>
                        {rfq.client.reputationScore && (
                          <span className="text-orange-600">
                            ⭐ {rfq.client.reputationScore.toFixed(1)}★
                          </span>
                        )}
                        {rfq.client.financialScore && (
                          <span className="text-blue-600">
                            📊 Scor: {rfq.client.financialScore}/100
                          </span>
                        )}
                        {rfq.budget && (
                          <span className="text-green-600">
                            💰 {rfq.budget.toLocaleString('ro-RO')} RON
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                        ❌ Respins Automat
                      </span>
                      {willDeleteIn > 0 ? (
                        <p className="mt-2 text-xs text-gray-500">
                          🗑️ Se șterge în {willDeleteIn} zile
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-red-600 font-medium">
                          🗑️ Va fi șters curând
                        </p>
                      )}
                    </div>
                  </div>

                  {/* AI Decision Reason */}
                  {rfq.aiDecisionReason && (
                    <div className="mb-4 bg-gray-50 border border-gray-200 rounded p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">🤖 Motivul AI:</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {rfq.aiDecisionReason.split('\n\n')[0]}
                      </p>
                      {rfq.aiConfidenceScore && (
                        <p className="mt-2 text-xs text-gray-500">
                          Încredere: {rfq.aiConfidenceScore.toFixed(0)}%
                        </p>
                      )}
                    </div>
                  )}

                  {/* Description preview */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{rfq.description}</p>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => setSelectedRFQ(selectedRFQ?.id === rfq.id ? null : rfq)}
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
                    >
                      {selectedRFQ?.id === rfq.id ? '▲ Ascunde Detalii' : '▼ Vezi Detalii'}
                    </button>
                    <button
                      onClick={() => handleReEvaluate(rfq.id)}
                      disabled={processing}
                      className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition disabled:opacity-50"
                    >
                      ✅ Re-evaluează și Publică
                    </button>
                    <button
                      onClick={() => handleDelete(rfq.id)}
                      disabled={processing}
                      className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition disabled:opacity-50"
                    >
                      🗑️ Șterge Definitiv
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {selectedRFQ?.id === rfq.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-1">Descriere:</h4>
                        <p className="text-gray-600 text-sm">{rfq.description}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-1">Detalii Client:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>📧 Email: {rfq.client.email}</li>
                          <li>👤 Username: {rfq.client.username}</li>
                          {rfq.client.companyName && <li>🏢 Companie: {rfq.client.companyName}</li>}
                        </ul>
                      </div>
                      {rfq.aiDecisionReason && (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-1">Decizie Completă AI:</h4>
                          <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-wrap font-mono">
                            {rfq.aiDecisionReason}
                          </pre>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 pt-2">
                        <p>📅 Creat: {new Date(rfq.createdAt).toLocaleString('ro-RO')}</p>
                        {rfq.autoProcessedAt && (
                          <p>🤖 Procesat: {new Date(rfq.autoProcessedAt).toLocaleString('ro-RO')}</p>
                        )}
                        <p>📆 Deadline: {new Date(rfq.deadline).toLocaleDateString('ro-RO')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {rfqs.length > 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📊 Rezumat</h3>
          <p className="text-sm text-blue-800">
            Total RFQ-uri respinse: <strong>{rfqs.length}</strong>
          </p>
          <p className="text-xs text-blue-700 mt-2">
            💡 RFQ-urile respinse automat sunt șterse complet după 7 zile pentru a păstra baza de date curată.
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
