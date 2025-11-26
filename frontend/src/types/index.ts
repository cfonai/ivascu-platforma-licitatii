// User types
export type UserRole = 'admin' | 'client' | 'supplier';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

// RFQ types
export type RFQStatus = 'draft' | 'published' | 'offers_received' | 'negotiation' | 'final_offer_selected' | 'sent_to_client' | 'closed';

export interface RFQ {
  id: string;
  clientId: string;
  title: string;
  description: string;
  requirements: string;
  deadline: string;
  budget?: number;
  status: RFQStatus;
  createdAt: string;
  publishedAt?: string;
  closedAt?: string;
  client?: User;
  _count?: {
    offers: number;
  };
}

export interface CreateRFQData {
  title: string;
  description: string;
  requirements: string;
  deadline: string;
  budget?: number;
}

// API Response types
export interface ApiError {
  error: string;
}
