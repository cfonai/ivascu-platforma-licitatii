import { useState, FormEvent } from 'react';
import { SearchFilters } from '../types/supplier.types';

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [material, setMaterial] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch({ material, location });
  };

  const handleReset = () => {
    setMaterial('');
    setLocation('');
    onSearch({ material: '', location: '' });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
        Găsește Furnizori
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Material/Product Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material / Produs
            </label>
            <input
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="ex: Ciment, Beton, Structuri metalice..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Caută după material, produs sau specializare
            </p>
          </div>

          {/* Location Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Locație
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ex: București, Cluj, Timiș..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Oraș sau județ
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 btn-gradient btn-gradient-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Se caută...
              </span>
            ) : (
              '🔍 Caută Furnizori'
            )}
          </button>

          {(material || location) && !isLoading && (
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Resetează
            </button>
          )}
        </div>

        {/* Info hints */}
        {!material && !location && !isLoading && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <span className="font-medium">Sfat:</span> Lasă câmpurile goale pentru a vedea toți furnizorii disponibili
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
