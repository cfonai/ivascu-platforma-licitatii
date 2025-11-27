import { Supplier, SupplierStats } from '../types/supplier.types';
import { getTopSuppliers, getClosestSuppliers, calculateStats, getAIRecommendation, estimateDeliveryTime } from '../SupplierMapService';

interface SupplierSidebarProps {
  suppliers: Supplier[];
  searchTime?: number;
}

export default function SupplierSidebar({ suppliers, searchTime }: SupplierSidebarProps) {
  const topSuppliers = getTopSuppliers(suppliers, 10);
  const closestSuppliers = getClosestSuppliers(suppliers, 5);
  const stats = calculateStats(suppliers);
  const aiRecommendation = getAIRecommendation(suppliers);

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
      {/* Search Time Badge */}
      {searchTime && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            🕒 <span className="font-semibold">AI a găsit furnizori în {searchTime.toFixed(1)} sec</span>
          </p>
          <p className="text-xs text-green-600 mt-1">
            📦 Livrare optimizată după locație
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Total Furnizori</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalSuppliers}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Top Rating</p>
          <p className="text-2xl font-bold text-gray-900">
            ⭐ {stats.topReputationScore.toFixed(1)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600">Distanță Medie</p>
          <p className="text-2xl font-bold text-gray-900">{stats.averageDistance} km</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600">Rata Succes</p>
          <p className="text-2xl font-bold text-gray-900">{stats.averageSuccessRate}%</p>
        </div>
      </div>

      {/* AI Recommendation */}
      {aiRecommendation && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-lg p-5 border-2 border-purple-300">
          <h3 className="text-lg font-bold text-purple-900 mb-3">
            🤖 #1 Recomandare AI
          </h3>
          <div className="space-y-2">
            <p className="font-bold text-gray-900">{aiRecommendation.name}</p>
            <div className="flex items-center gap-3 text-sm">
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                ⭐ {aiRecommendation.reputationScore}
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                ✓ {aiRecommendation.successRate}%
              </span>
            </div>
            <p className="text-sm text-gray-700">
              📍 {aiRecommendation.city}, {aiRecommendation.county}
            </p>
            <p className="text-xs text-gray-600">
              🚚 Livrare estimată: {estimateDeliveryTime(
                (aiRecommendation as any).distance || 0
              )}
            </p>
            <p className="text-xs text-purple-700 font-medium mt-2">
              Scor competitivitate: 87%
            </p>
          </div>
        </div>
      )}

      {/* Top 10 National Suppliers */}
      {topSuppliers.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            🏆 Top 10 Furnizori Naționali
          </h3>
          <div className="space-y-3">
            {topSuppliers.map((supplier, index) => (
              <div
                key={supplier.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {supplier.name}
                  </p>
                  <p className="text-xs text-gray-600">{supplier.city}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {supplier.ordersWon} comenzi
                    </span>
                    <span className="text-xs text-yellow-600">
                      ⭐ {supplier.reputationScore}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closest 5 Suppliers */}
      {closestSuppliers.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            📍 Cei mai apropiați 5 furnizori
          </h3>
          <div className="space-y-3">
            {closestSuppliers.map((supplier) => {
              const distance = (supplier as any).distance || 0;
              return (
                <div
                  key={supplier.id}
                  className="p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-gray-900">{supplier.name}</p>
                    <span className="text-sm font-bold text-green-600">
                      {Math.round(distance)} km
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {supplier.city}, {supplier.county}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      🚚 {estimateDeliveryTime(distance)}
                    </span>
                    <span className="text-xs text-yellow-600">
                      ⭐ {supplier.reputationScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform Insights */}
      {suppliers.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl shadow-md p-5 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-3">
            📊 Insight-uri Platformă
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              • <span className="font-medium">Top 3 materiale:</span> Beton, Ciment, Prefabricate
            </p>
            <p className="text-gray-700">
              • <span className="font-medium">Regiuni active:</span> București, Cluj, Brașov
            </p>
            <p className="text-gray-700">
              • <span className="font-medium">Timp mediu răspuns:</span> 24h
            </p>
            <p className="text-gray-700">
              • <span className="font-medium">Satisfacție clienți:</span> 92%
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {suppliers.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Nu s-au găsit furnizori
          </h3>
          <p className="text-gray-600 text-sm">
            Încearcă să modifici criteriile de căutare sau lasă câmpurile goale pentru a vedea toți furnizorii.
          </p>
        </div>
      )}
    </div>
  );
}
