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

// Offer types
export type OfferStatus = 'submitted' | 'under_review' | 'in_negotiation' | 'final_confirmed' | 'accepted' | 'rejected' | 'withdrawn';

export interface Offer {
  id: string;
  rfqId: string;
  supplierId: string;
  price: number;
  deliveryTime: string;
  description: string;
  terms: string;
  status: OfferStatus;
  isLocked: boolean;
  submittedAt: string;
  updatedAt: string;
  supplier?: User;
  rfq?: {
    id: string;
    title: string;
    clientId?: string;
  };
}

export interface CreateOfferData {
  rfqId: string;
  price: number;
  deliveryTime: string;
  description: string;
  terms: string;
}

// Negotiation types
export type NegotiationStatus = 'active' | 'completed' | 'cancelled';

export interface NegotiationMessage {
  id: string;
  negotiationId: string;
  senderId: string;
  senderRole: 'admin' | 'supplier';
  roundNumber: number;
  message: string;
  proposedPrice?: number;
  proposedDeliveryTime?: string;
  createdAt: string;
  sender?: User;
}

export interface Negotiation {
  id: string;
  offerId: string;
  rfqId: string;
  adminId: string;
  supplierId: string;
  rounds: number;
  status: NegotiationStatus;
  createdAt: string;
  completedAt?: string;
  messages?: NegotiationMessage[];
  offer?: Offer;
  rfq?: {
    id: string;
    title: string;
    clientId: string;
  };
}

export interface InitiateNegotiationData {
  offerId: string;
  message: string;
  proposedPrice?: number;
  proposedDeliveryTime?: string;
}

export interface RespondNegotiationData {
  message: string;
  proposedPrice?: number;
  proposedDeliveryTime?: string;
  acceptFinal?: boolean;
}

// API Response types
export interface ApiError {
  error: string;
}
