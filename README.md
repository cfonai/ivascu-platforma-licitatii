# Platformă Licitații - POC

A proof-of-concept procurement/bidding platform with role-based access for Admin, Client, and Supplier users.

## Project Structure

```
platforma-licitatii/
├── frontend/              # React + TypeScript + Tailwind CSS
├── backend/               # Node.js + TypeScript + Express + Prisma
├── IMPLEMENTATION_GUIDE.md  # Detailed implementation guide
├── FLOWCHART.txt          # Process flowchart (Romanian)
├── plan-poc.txt           # POC plan (Romanian)
└── taskuri-poc.txt        # Task list (Romanian)
```

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling with custom gradients
- **React Router** - Routing
- **React Hook Form + Zod** - Form validation
- **Axios** - HTTP client

### Backend
- **Node.js + TypeScript** - Runtime & language
- **Express** - Web framework
- **Prisma** - ORM
- **SQLite** - Database (for POC)
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Zod** - Validation

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd platforma-licitatii
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Run migrations to create database
npm run prisma:migrate

# (Optional) Seed database with initial data
npm run prisma:seed

# Start development server
npm run dev
```

Backend will run on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

## Features

### User Roles
- **Admin**: Creates user accounts, publishes RFQs, manages negotiations, processes orders
- **Client**: Creates RFQ requests, accepts/rejects final offers
- **Supplier**: Views published RFQs, submits offers, participates in negotiations

### Core Functionality
- ✅ Role-based authentication (JWT)
- ✅ RFQ (Request for Quotation) management
- ✅ Offer submission and review
- ✅ Negotiation system (max 2-3 rounds)
- ✅ Order management with locked status
- ✅ Mock payment flow
- ✅ Delivery tracking
- ✅ Role-specific dashboards
- ✅ Status-based deletion rules
- ✅ Confirmation popups for all deletions

### Status Flows

#### RFQ Status
`Draft` → `Published` → `Offers Received` → `Negotiation` → `Final Offer Selected` → `Sent to Client` → `Closed`

#### Offer Status
`Submitted` → `Under Review` → `In Negotiation` → `Final Confirmed` → `Accepted/Rejected`

#### Order Status
`Created` → `Payment Initiated` → `Payment Confirmed` → `Delivery In Progress` → `Delivered` → `Received` → `Finalized` → `Archived`

### Locked Status Rules
Items with **LOCKED** status cannot be deleted or modified:
- Final offer confirmed by Supplier
- Final offer accepted by Admin
- Orders after Client acceptance
- Payment confirmed orders
- Finalized/Archived orders

## Database Schema

See `backend/prisma/schema.prisma` for complete schema with:
- Users (3 roles)
- RFQs (Request for Quotation)
- Offers
- Negotiations
- NegotiationMessages
- Orders

## Development Scripts

### Backend
```bash
npm run dev              # Start dev server with hot reload
npm run build           # Compile TypeScript to JavaScript
npm run start           # Run production build
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run database migrations
npm run prisma:studio   # Open Prisma Studio (DB GUI)
npm run prisma:seed     # Seed database with initial data
```

### Frontend
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## UI/UX

### Color Palette
- **Primary**: Blue-Purple gradient (`#3B82F6` → `#8B5CF6`)
- **Success**: Green-Teal gradient (`#10B981` → `#14B8A6`)
- **Warning**: Yellow-Orange gradient (`#F59E0B` → `#F97316`)
- **Danger**: Red gradient (`#EF4444` → `#DC2626`)

### Romanian UI Strings
All user-facing text is in Romanian:
- Authentication: "Autentificare", "Nume utilizator", "Parolă"
- Roles: "Administrator", "Client", "Furnizor"
- Actions: "Creează", "Publică", "Șterge", "Acceptă", "Respinge"
- Confirmations: "Ești sigur că vrei să ștergi?"

## Implementation Guide

For detailed implementation steps, business rules, and technical specifications, see:
- **IMPLEMENTATION_GUIDE.md** - Comprehensive guide with:
  - Complete data models
  - API endpoints
  - Business rules
  - Phase-by-phase implementation plan
  - Testing strategy
  - Success criteria

## API Endpoints (Planned)

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `POST /api/users` - Create user
- `GET /api/users` - List users

### RFQs
- `POST /api/rfqs` - Create RFQ (Client)
- `GET /api/rfqs` - List RFQs
- `GET /api/rfqs/:id` - Get RFQ details
- `PATCH /api/rfqs/:id/publish` - Publish RFQ (Admin)
- `DELETE /api/rfqs/:id` - Delete RFQ

### Offers
- `POST /api/offers` - Submit offer (Supplier)
- `GET /api/offers` - List offers
- `DELETE /api/offers/:id` - Delete offer

### Negotiations
- `POST /api/negotiations` - Start negotiation (Admin)
- `POST /api/negotiations/:id/messages` - Add message
- `PATCH /api/negotiations/:id/complete` - Complete negotiation

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - List orders
- `PATCH /api/orders/:id/payment` - Update payment (Admin)
- `PATCH /api/orders/:id/delivery` - Update delivery
- `PATCH /api/orders/:id/finalize` - Finalize order (Admin)

### Dashboard
- `GET /api/dashboard/admin` - Admin dashboard
- `GET /api/dashboard/client` - Client dashboard
- `GET /api/dashboard/supplier` - Supplier dashboard

## Security Features
- Password hashing with bcrypt
- JWT with httpOnly cookies
- CORS configuration
- Input validation (Zod)
- Role-based access control (RBAC)
- SQL injection prevention (Prisma ORM)

## Testing
- Unit tests for backend endpoints
- Integration tests for complete flows
- E2E tests for user journeys

## Current Status

### ✅ Completed
- [x] Project structure setup
- [x] Frontend configuration (React + TypeScript + Vite + Tailwind)
- [x] Backend configuration (Node.js + TypeScript + Express)
- [x] Prisma schema with all models
- [x] Database setup (SQLite)
- [x] Basic UI components and gradient styles
- [x] Implementation guide documentation

### 🚧 In Progress
- [ ] Authentication system
- [ ] User management (Admin)
- [ ] RFQ management
- [ ] Offer management
- [ ] Negotiation system
- [ ] Order management
- [ ] Dashboard implementations
- [ ] Testing

## Contributing
This is a POC project. For implementation questions, refer to `IMPLEMENTATION_GUIDE.md`.

## License
MIT
