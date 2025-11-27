import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-primary';
      case 'client':
        return 'bg-gradient-success';
      case 'supplier':
        return 'bg-gradient-warning';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'client':
        return 'Client';
      case 'supplier':
        return 'Furnizor';
      default:
        return role;
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
              className="px-4 py-2 text-primary-600 border-b-2 border-primary-600 font-medium"
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
            {/* TODO: Future feature - Add Statistics navigation link */}
            {/* <button onClick={() => navigate('/statistics')} className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium">Statistici</button> */}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Card */}
          <div className="card mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Bine ai venit, {user?.username}!
                </h2>
                <p className="text-gray-600">
                  Email: {user?.email}
                </p>
              </div>
              <div>
                <span className={`${getRoleColor(user?.role || '')} px-4 py-2 rounded-full text-white font-medium`}>
                  {getRoleName(user?.role || '')}
                </span>
              </div>
            </div>
          </div>

          {/* Role-specific content */}
          {user?.role === 'admin' && (
            <div className="card bg-gradient-primary text-white">
              <h3 className="text-xl font-bold mb-3">Panou Administrator</h3>
              <p className="mb-4">
                Ca administrator, poți gestiona utilizatori, publica cereri RFQ, și aproba oferte.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 p-4 rounded-lg">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Cereri active</div>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Oferte primite</div>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Comenzi active</div>
                </div>
              </div>
            </div>
          )}

          {user?.role === 'client' && (
            <div className="card bg-gradient-success text-white">
              <h3 className="text-xl font-bold mb-3">Panou Client</h3>
              <p className="mb-4">
                Ca client, poți crea cereri RFQ, vizualiza oferte, și accepta propuneri.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 p-4 rounded-lg">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Cereri postate</div>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Oferte finale</div>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Comenzi active</div>
                </div>
              </div>
            </div>
          )}

          {user?.role === 'supplier' && (
            <div className="card bg-gradient-warning text-white">
              <h3 className="text-xl font-bold mb-3">Panou Furnizor</h3>
              <p className="mb-4">
                Ca furnizor, poți vizualiza cereri RFQ publicate și depune oferte.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 p-4 rounded-lg">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Cereri disponibile</div>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Oferte depuse</div>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Comenzi câștigate</div>
                </div>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="card mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              🚀 Status POC
            </h3>
            <p className="text-gray-600 mb-4">
              Autentificarea funcționează! Următorii pași:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Autentificare cu JWT
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Dashboard personalizat pe roluri
              </li>
              <li className="flex items-center">
                <span className="text-gray-400 mr-2">○</span>
                Gestionare utilizatori (Admin)
              </li>
              <li className="flex items-center">
                <span className="text-gray-400 mr-2">○</span>
                Creare cereri RFQ (Client)
              </li>
              <li className="flex items-center">
                <span className="text-gray-400 mr-2">○</span>
                Depunere oferte (Furnizor)
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
