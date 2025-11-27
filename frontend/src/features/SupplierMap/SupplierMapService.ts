import { Supplier, SearchFilters, SupplierStats } from './types/supplier.types';
import { MOCK_SUPPLIERS } from './mockSuppliers';

/**
 * Service for Supplier Map operations
 * This abstraction allows easy swapping from mock data to real API calls later
 */

// Default client location (center of Romania for demo)
const DEFAULT_CLIENT_LAT = 45.9432;
const DEFAULT_CLIENT_LNG = 24.9668;

// Romanian city coordinates lookup for smart distance calculation
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'bucurești': { lat: 44.4268, lng: 26.1025 },
  'bucuresti': { lat: 44.4268, lng: 26.1025 },
  'bucharest': { lat: 44.4268, lng: 26.1025 },
  'cluj-napoca': { lat: 46.7712, lng: 23.6236 },
  'cluj': { lat: 46.7712, lng: 23.6236 },
  'timișoara': { lat: 45.7489, lng: 21.2087 },
  'timisoara': { lat: 45.7489, lng: 21.2087 },
  'iași': { lat: 47.1585, lng: 27.6014 },
  'iasi': { lat: 47.1585, lng: 27.6014 },
  'brașov': { lat: 45.6427, lng: 25.5887 },
  'brasov': { lat: 45.6427, lng: 25.5887 },
  'constanța': { lat: 44.1598, lng: 28.6348 },
  'constanta': { lat: 44.1598, lng: 28.6348 },
  'craiova': { lat: 44.3302, lng: 23.7949 },
  'galați': { lat: 45.4353, lng: 28.0080 },
  'galati': { lat: 45.4353, lng: 28.0080 },
  'ploiești': { lat: 44.9392, lng: 26.0319 },
  'ploiesti': { lat: 44.9392, lng: 26.0319 },
  'oradea': { lat: 47.0722, lng: 21.9217 },
  'bacău': { lat: 46.5676, lng: 26.9158 },
  'bacau': { lat: 46.5676, lng: 26.9158 },
  'sibiu': { lat: 45.7983, lng: 24.1256 },
  'târgu mureș': { lat: 46.5426, lng: 24.5561 },
  'targu mures': { lat: 46.5426, lng: 24.5561 },
  'bistrița': { lat: 47.1351, lng: 24.5032 },
  'bistrita': { lat: 47.1351, lng: 24.5032 },
  'buzău': { lat: 45.15, lng: 26.82 },
  'buzau': { lat: 45.15, lng: 26.82 },
  'târgu jiu': { lat: 45.05, lng: 23.28 },
  'targu jiu': { lat: 45.05, lng: 23.28 },
  'târnăveni': { lat: 46.6150, lng: 24.7911 },
  'tarnaveni': { lat: 46.6150, lng: 24.7911 },
  // Counties
  'timiș': { lat: 45.7489, lng: 21.2087 },
  'timis': { lat: 45.7489, lng: 21.2087 },
  'prahova': { lat: 44.9392, lng: 26.0319 },
  'mureș': { lat: 46.5426, lng: 24.5561 },
  'mures': { lat: 46.5426, lng: 24.5561 },
  'bihor': { lat: 47.0722, lng: 21.9217 },
  'gorj': { lat: 45.05, lng: 23.28 },
  'bistrița-năsăud': { lat: 47.1351, lng: 24.5032 },
  'bistrita-nasaud': { lat: 47.1351, lng: 24.5032 },
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Search suppliers based on filters
 * FOR POC: Filters mock data
 * LATER: Replace with API call to backend
 */
export async function searchSuppliers(filters: SearchFilters): Promise<Supplier[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  let results = [...MOCK_SUPPLIERS];

  // Filter by material (check specialties)
  if (filters.material && filters.material.trim()) {
    const searchTerm = filters.material.toLowerCase();
    results = results.filter(supplier =>
      supplier.specialties.some(specialty =>
        specialty.toLowerCase().includes(searchTerm)
      ) || supplier.name.toLowerCase().includes(searchTerm)
    );
  }

  // Filter by location (city or county)
  if (filters.location && filters.location.trim()) {
    const locationTerm = filters.location.toLowerCase();
    results = results.filter(supplier =>
      supplier.city.toLowerCase().includes(locationTerm) ||
      supplier.county.toLowerCase().includes(locationTerm)
    );
  }

  // Determine reference coordinates for distance calculation
  let referenceLat = DEFAULT_CLIENT_LAT;
  let referenceLng = DEFAULT_CLIENT_LNG;

  // If user searched for a specific location, use that as reference point
  if (filters.location && filters.location.trim()) {
    const searchedLocation = filters.location.toLowerCase().trim();
    const coords = CITY_COORDINATES[searchedLocation];
    if (coords) {
      referenceLat = coords.lat;
      referenceLng = coords.lng;
    }
  }

  // Add distance from reference point
  results = results.map(supplier => ({
    ...supplier,
    distance: calculateDistance(
      referenceLat,
      referenceLng,
      supplier.lat,
      supplier.lng
    )
  }));

  return results;
}

/**
 * Get all suppliers
 */
export async function getAllSuppliers(): Promise<Supplier[]> {
  return searchSuppliers({ material: '', location: '' });
}

/**
 * Get supplier by ID
 */
export async function getSupplierById(id: string): Promise<Supplier | null> {
  const supplier = MOCK_SUPPLIERS.find(s => s.id === id);
  return supplier || null;
}

/**
 * Calculate statistics from suppliers
 */
export function calculateStats(suppliers: Supplier[]): SupplierStats {
  if (suppliers.length === 0) {
    return {
      totalSuppliers: 0,
      averageDistance: 0,
      topReputationScore: 0,
      averageSuccessRate: 0
    };
  }

  // Use existing distance if available, otherwise calculate from default location
  const distances = suppliers.map(s => {
    if (s.distance !== undefined) {
      return s.distance;
    }
    return calculateDistance(
      DEFAULT_CLIENT_LAT,
      DEFAULT_CLIENT_LNG,
      s.lat,
      s.lng
    );
  });

  return {
    totalSuppliers: suppliers.length,
    averageDistance: Math.round(distances.reduce((a, b) => a + b, 0) / distances.length),
    topReputationScore: Math.max(...suppliers.map(s => s.reputationScore)),
    averageSuccessRate: Math.round(
      suppliers.reduce((sum, s) => sum + s.successRate, 0) / suppliers.length
    )
  };
}

/**
 * Get top suppliers by orders won
 */
export function getTopSuppliers(suppliers: Supplier[], limit: number = 10): Supplier[] {
  return [...suppliers]
    .sort((a, b) => b.ordersWon - a.ordersWon)
    .slice(0, limit);
}

/**
 * Get closest suppliers to client
 */
export function getClosestSuppliers(suppliers: Supplier[], limit: number = 5): Supplier[] {
  return [...suppliers]
    .map(supplier => ({
      ...supplier,
      // Use existing distance if available, otherwise calculate from default location
      distance: supplier.distance !== undefined ? supplier.distance : calculateDistance(
        DEFAULT_CLIENT_LAT,
        DEFAULT_CLIENT_LNG,
        supplier.lat,
        supplier.lng
      )
    }))
    .sort((a, b) => a.distance! - b.distance!)
    .slice(0, limit);
}

/**
 * Estimate delivery time based on distance
 * Simple formula: base time + (distance * factor)
 */
export function estimateDeliveryTime(distanceKm: number): string {
  const baseDays = 1;
  const additionalDays = Math.floor(distanceKm / 100);
  const totalDays = baseDays + additionalDays;

  if (totalDays === 1) return '1 zi';
  if (totalDays < 7) return `${totalDays} zile`;
  const weeks = Math.floor(totalDays / 7);
  return `${weeks} ${weeks === 1 ? 'săptămână' : 'săptămâni'}`;
}

/**
 * Get AI recommendation (mock for POC)
 * Based on: reputation score, success rate, and distance
 */
export function getAIRecommendation(suppliers: Supplier[]): Supplier | null {
  if (suppliers.length === 0) return null;

  // Add distance calculation (use existing if available)
  const suppliersWithDistance = suppliers.map(supplier => ({
    ...supplier,
    // Use existing distance if available, otherwise calculate from default location
    distance: supplier.distance !== undefined ? supplier.distance : calculateDistance(
      DEFAULT_CLIENT_LAT,
      DEFAULT_CLIENT_LNG,
      supplier.lat,
      supplier.lng
    )
  }));

  // Calculate AI score (weighted: 40% reputation, 30% success rate, 30% proximity)
  const scored = suppliersWithDistance.map(supplier => {
    const proximityScore = Math.max(0, 1 - (supplier.distance! / 500)); // Normalize to 0-1
    const aiScore =
      (supplier.reputationScore / 5) * 0.4 +
      (supplier.successRate / 100) * 0.3 +
      proximityScore * 0.3;

    return { ...supplier, aiScore };
  });

  // Return top AI recommendation
  const best = scored.sort((a, b) => b.aiScore - a.aiScore)[0];
  return best;
}
