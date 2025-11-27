export interface Supplier {
  id: string;
  name: string;
  city: string;
  county: string;
  lat: number;
  lng: number;
  ordersWon: number;
  offersSubmitted: number;
  successRate: number;
  reputationScore: number;
  activeSince: string;
  specialties: string[];
  phone: string;
  email: string;
}

export interface SearchFilters {
  material: string;
  location: string;
}

export interface SupplierStats {
  totalSuppliers: number;
  averageDistance: number;
  topReputationScore: number;
  averageSuccessRate: number;
}
