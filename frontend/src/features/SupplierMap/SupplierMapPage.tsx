import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Supplier, SearchFilters } from './types/supplier.types';
import { searchSuppliers } from './SupplierMapService';
import SearchForm from './components/SearchForm';
import MapView from './components/MapView';
import SupplierSidebar from './components/SupplierSidebar';

export default function SupplierMapPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTime, setSearchTime] = useState<number | undefined>();

  // Load all suppliers on mount
  useEffect(() => {
    handleSearch({ material: '', location: '' });
  }, []);

  const handleSearch = async (filters: SearchFilters) => {
    setIsLoading(true);
    const startTime = performance.now();

    try {
      const results = await searchSuppliers(filters);
      const endTime = performance.now();
      setSearchTime((endTime - startTime) / 1000);
      setSuppliers(results);
    } catch (error) {
      console.error('Error searching suppliers:', error);
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
            <button
              onClick={() => navigate('/archive')}
              className="px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
            >
              Arhivă
            </button>
            <button className="px-4 py-2 text-primary-600 border-b-2 border-primary-600 font-medium">
              Căutare Furnizor
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search Form */}
        <SearchForm onSearch={handleSearch} isLoading={isLoading} />

        {/* Map and Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map - Takes 2/3 on large screens */}
          <div className="lg:col-span-2 h-[600px]">
            {isLoading ? (
              <div className="bg-white rounded-xl shadow-lg h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                  <p className="text-gray-600">Se încarcă harta...</p>
                </div>
              </div>
            ) : (
              <MapView suppliers={suppliers} />
            )}
          </div>

          {/* Sidebar - Takes 1/3 on large screens */}
          <div className="lg:col-span-1">
            <SupplierSidebar suppliers={suppliers} searchTime={searchTime} />
          </div>
        </div>

        {/* Results Summary */}
        {!isLoading && suppliers.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {suppliers.length} {suppliers.length === 1 ? 'furnizor găsit' : 'furnizori găsiți'}
                </h3>
                <p className="text-sm text-gray-600">
                  Click pe markeri pentru mai multe detalii
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Ultima căutare</p>
                <p className="text-lg font-bold text-primary-600">
                  {searchTime ? `${searchTime.toFixed(2)}s` : '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-3">
            💡 Cum funcționează Căutarea de Furnizori?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold mb-2">1. Caută</h4>
              <p>Folosește filtrele pentru a găsi furnizori după material sau locație</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2. Explorează</h4>
              <p>Vezi furnizorii pe hartă și compară statisticile lor</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3. Contactează</h4>
              <p>Click pe marker pentru detalii de contact și informații complete</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
