# POC Implementation Guide - Offer Intermediation Platform

## Project Overview
A procurement/bidding platform with 3 roles (Admin, Client, Supplier) for managing RFQs (Request for Quotation), negotiations, and orders.

**Platform Language**: Romanian (UI/UX)
**Code/Documentation**: English

---

## 1. Business Rules & Core Concepts

### 1.1 User Roles & Permissions

| Role | Can Create | Can View | Can Modify | Can Delete |
|------|-----------|----------|------------|-----------|
| **Admin** | Users, Publish RFQ | Everything | RFQ status, Orders, Negotiations | Anything (if not Locked) |
| **Client** | RFQ (Draft) | Own RFQs, Final Offers, Orders | Own Draft RFQs | Own Draft RFQs only |
| **Supplier** | Offers | Published RFQs, Own Offers | Own Offers (if not Locked) | Own Offers (if not Locked) |

### 1.2 Status Flow & Transitions

#### RFQ Status Flow:
```
Draft (Client)
  → Published (Admin)
    → Offers Received (auto when supplier submits)
      → Negotiation Started (Admin)
        → Final Offer Selected (Admin)
          → Sent to Client (Admin)
```

#### Offer Status Flow:
```
Submitted (Supplier)
  → Under Review (Admin views)
    → In Negotiation (Admin initiates)
      → Final Offer Confirmed by Supplier
        → Final Offer Accepted by Admin
          → Sent to Client
```

#### Order Status Flow:
```
Client Accepted → Order Created (LOCKED)
  → Payment Initiated (Admin mock)
    → Payment Confirmed (Admin mock) (LOCKED)
      → Delivery In Progress
        → Delivered
          → Received by Client
            → Finalized (Admin)
              → Archived (LOCKED)
```

### 1.3 Locked Status Rules

**LOCKED statuses (cannot be deleted or modified):**
- Final Offer Confirmed by Supplier
- Final Offer Accepted by Admin
- Order Created (after Client acceptance)
- Payment Confirmed
- Order Finalized/Archived

**Deletion rules:**
- All deletions require popup confirmation: "Ești sigur că vrei să ștergi?" (Are you sure you want to delete?)
- Draft RFQ: Client can delete
- Submitted Offer: Supplier can delete (if not Locked)
- Admin can delete anything that is not Locked
- Any Locked item: deletion blocked with message

### 1.4 Negotiation Rules
- Max 2-3 rounds between Admin ↔ Supplier
- Negotiation happens via simple form
- Each round: Admin proposes → Supplier responds
- Supplier can accept or counter-propose
- Once Supplier confirms final offer → LOCKED
- Negotiation history must be preserved

---

## 2. Data Model

### 2.1 Database Schema

#### Users Table
```typescript
{
  id: string (UUID)
  username: string (unique)
  password: string (hashed)
  role: 'admin' | 'client' | 'supplier'
  email: string
  createdAt: timestamp
  createdBy: string (adminId) // for client/supplier accounts
}
```

#### RFQ Table
```typescript
{
  id: string (UUID)
  clientId: string (FK → Users)
  title: string
  description: string
  requirements: string
  deadline: date
  budget: number (optional)
  status: 'draft' | 'published' | 'offers_received' | 'negotiation' | 'final_offer_selected' | 'sent_to_client' | 'closed'
  createdAt: timestamp
  publishedAt: timestamp (nullable)
  closedAt: timestamp (nullable)
}
```

#### Offers Table
```typescript
{
  id: string (UUID)
  rfqId: string (FK → RFQ)
  supplierId: string (FK → Users)
  price: number
  deliveryTime: string
  description: string
  terms: string
  status: 'submitted' | 'under_review' | 'in_negotiation' | 'final_confirmed' | 'accepted' | 'rejected' | 'withdrawn'
  isLocked: boolean
  submittedAt: timestamp
  updatedAt: timestamp
}
```

#### Negotiations Table
```typescript
{
  id: string (UUID)
  offerId: string (FK → Offers)
  rfqId: string (FK → RFQ)
  adminId: string (FK → Users)
  supplierId: string (FK → Users)
  rounds: number (max 3)
  status: 'active' | 'completed' | 'cancelled'
  createdAt: timestamp
  completedAt: timestamp (nullable)
}
```

#### NegotiationMessages Table
```typescript
{
  id: string (UUID)
  negotiationId: string (FK → Negotiations)
  senderId: string (FK → Users)
  senderRole: 'admin' | 'supplier'
  roundNumber: number (1-3)
  message: string
  proposedPrice: number (nullable)
  proposedDeliveryTime: string (nullable)
  createdAt: timestamp
}
```

#### Orders Table
```typescript
{
  id: string (UUID)
  rfqId: string (FK → RFQ)
  offerId: string (FK → Offers)
  clientId: string (FK → Users)
  supplierId: string (FK → Users)
  finalPrice: number
  finalTerms: string
  status: 'created' | 'payment_initiated' | 'payment_confirmed' | 'delivery_in_progress' | 'delivered' | 'received' | 'finalized' | 'archived'
  isLocked: boolean
  paymentMockStatus: 'pending' | 'initiated' | 'confirmed'
  deliveryStatus: 'pending' | 'in_progress' | 'delivered' | 'received'
  createdAt: timestamp
  finalizedAt: timestamp (nullable)
  archivedAt: timestamp (nullable)
}
```

---

## 3. Tech Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS with custom gradient utilities
- **Routing**: React Router v6
- **State Management**: Context API + React Query for server state
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Custom components with gradient buttons

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express or Fastify
- **Database**: PostgreSQL (or SQLite for quick POC)
- **ORM**: Prisma or TypeORM
- **Authentication**: JWT with httpOnly cookies
- **Validation**: Zod

### Development Tools
- **Build**: Vite for frontend, tsc for backend
- **Linting**: ESLint + Prettier
- **Type checking**: TypeScript strict mode
- **Testing**: Vitest (unit) + Playwright (e2e)

---

## 4. Implementation Order

### Phase 1: Project Setup
1. Initialize monorepo structure (frontend + backend)
2. Setup TypeScript configs
3. Setup Tailwind CSS with custom theme
4. Setup database and Prisma schema
5. Setup basic Express server with JWT auth

### Phase 2: Authentication & User Management
1. Create User model and auth endpoints
2. Implement JWT login/logout
3. Create Login page (Romanian UI)
4. Create Admin user creation page
5. Implement role-based route protection

### Phase 3: RFQ Management
1. Create RFQ model and endpoints
2. Implement Client RFQ creation (Draft)
3. Implement Admin RFQ publishing
4. Create RFQ list and detail pages
5. Implement RFQ deletion with popup (Draft only)

### Phase 4: Offer Management
1. Create Offer model and endpoints
2. Implement Supplier offer submission
3. Implement Admin offer review
4. Create Offer list and detail pages
5. Implement Offer deletion with popup (if not Locked)

### Phase 5: Negotiation System
1. Create Negotiation models and endpoints
2. Implement negotiation initiation (Admin)
3. Implement negotiation response (Supplier)
4. Create negotiation UI (max 3 rounds)
5. Implement negotiation completion and locking

### Phase 6: Order Management
1. Create Order model and endpoints
2. Implement Client offer acceptance/rejection
3. Implement Order creation (auto-lock)
4. Create Order detail page
5. Implement mock payment flow (Admin)

### Phase 7: Delivery & Finalization
1. Implement delivery status updates
2. Create delivery tracking UI
3. Implement order finalization (Admin)
4. Implement archive functionality
5. Ensure all locked status rules

### Phase 8: Dashboard
1. Create Admin dashboard (active requests, offers, negotiations, orders, profit mock)
2. Create Client dashboard (posted requests, status, final offers, orders, archive)
3. Create Supplier dashboard (visible requests, submitted offers, negotiations, won orders, history)
4. Implement real-time status updates

### Phase 9: Testing & Polish
1. Unit tests for backend endpoints
2. Integration tests for complete flows
3. E2E tests for user journeys
4. UI polish and gradient refinements
5. Romanian language review

---

## 5. UI/UX Guidelines

### Color Palette
- **Primary**: Gradient blue-purple (#3B82F6 → #8B5CF6)
- **Success**: Gradient green (#10B981 → #14B8A6)
- **Warning**: Gradient yellow-orange (#F59E0B → #F97316)
- **Danger**: Gradient red (#EF4444 → #DC2626)
- **Neutral**: Gray scale (#F3F4F6 → #1F2937)

### Status Badges
- **Draft**: Gray
- **Published**: Blue
- **Submitted**: Green
- **In Negotiation**: Purple
- **Locked**: Red with lock icon
- **Finalized**: Green with checkmark
- **Archived**: Dark gray

### Components to Build
1. **Button** - gradient variants, loading states
2. **Card** - for RFQ, Offers, Orders
3. **Modal** - for confirmations and forms
4. **Badge** - for status display
5. **Table** - for lists with sorting
6. **Form** - with validation and error states
7. **StatusTimeline** - for order tracking

### Romanian UI Strings Needed
- Login: "Autentificare", "Nume utilizator", "Parolă"
- Roles: "Administrator", "Client", "Furnizor"
- Actions: "Creează", "Publică", "Șterge", "Acceptă", "Respinge", "Negociază"
- Confirmation: "Ești sigur că vrei să ștergi?"
- Status messages: "Cerere publicată", "Ofertă depusă", "Comandă creată", etc.

---

## 6. Key Features Checklist

### Must-Have Features
- [ ] Role-based authentication (Admin, Client, Supplier)
- [ ] Admin creates user accounts
- [ ] Client creates RFQ (Draft status)
- [ ] Admin publishes RFQ
- [ ] Supplier views published RFQs
- [ ] Supplier submits offers
- [ ] Admin reviews offers
- [ ] Admin initiates negotiation (max 2-3 rounds)
- [ ] Supplier accepts/counter-proposes in negotiation
- [ ] Admin selects final offer
- [ ] Client accepts/rejects final offer
- [ ] Order creation with auto-lock
- [ ] Mock payment flow
- [ ] Delivery status tracking
- [ ] Order finalization and archiving
- [ ] Role-specific dashboards
- [ ] Deletion with popup confirmation
- [ ] Locked status enforcement
- [ ] Romanian language UI

### Nice-to-Have Features
- [ ] Email notifications
- [ ] Real-time updates (WebSockets)
- [ ] File attachments for RFQ/Offers
- [ ] Advanced filtering and search
- [ ] Export to PDF/Excel
- [ ] Audit log
- [ ] User profile management
- [ ] Mobile responsive design
- [ ] Dark mode

---

## 7. Testing Strategy

### Unit Tests
- All backend endpoints (CRUD operations)
- Authentication and authorization logic
- Status transition validations
- Locked status checks
- Deletion rules enforcement

### Integration Tests
- Complete RFQ flow (Draft → Published → Offers)
- Negotiation flow (Admin ↔ Supplier)
- Order flow (Acceptance → Payment → Delivery)
- Dashboard data aggregation

### E2E Tests
- User journey: Client creates RFQ → Admin publishes → Supplier submits offer → Client accepts → Order completed
- User journey: Negotiation flow with 3 rounds
- User journey: Delete attempts on Locked items (should fail)
- User journey: Dashboard reflects correct data for each role

---

## 8. Security Considerations

- Password hashing with bcrypt
- JWT with httpOnly cookies (prevent XSS)
- CORS configuration
- Input validation on all endpoints
- SQL injection prevention (ORM)
- Role-based access control (RBAC)
- Rate limiting on authentication endpoints
- Secure session management

---

## 9. Deployment Plan (Future)

- Frontend: Vercel/Netlify
- Backend: Railway/Render/Fly.io
- Database: PostgreSQL on Supabase/Railway
- Environment variables management
- CI/CD with GitHub Actions

---

## 10. Quick Reference: Who Can Do What

| Action | Admin | Client | Supplier |
|--------|-------|--------|----------|
| Create users | ✅ | ❌ | ❌ |
| Create RFQ | ❌ | ✅ (Draft) | ❌ |
| Publish RFQ | ✅ | ❌ | ❌ |
| View published RFQ | ✅ | ✅ (own) | ✅ (all) |
| Submit offer | ❌ | ❌ | ✅ |
| View offers | ✅ (all) | ✅ (own RFQ) | ✅ (own) |
| Initiate negotiation | ✅ | ❌ | ❌ |
| Respond to negotiation | ❌ | ❌ | ✅ |
| Accept/Reject final offer | ❌ | ✅ | ❌ |
| Process payment (mock) | ✅ | ❌ | ❌ |
| Update delivery status | ✅ | ❌ | ✅ |
| Finalize order | ✅ | ❌ | ❌ |
| Delete Draft RFQ | ✅ | ✅ (own) | ❌ |
| Delete Submitted Offer | ✅ | ❌ | ✅ (own, if not Locked) |
| Delete Locked items | ❌ | ❌ | ❌ |

---

## 11. API Endpoints Overview

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `POST /api/users` - Create user (client/supplier)
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user details

### RFQs
- `POST /api/rfqs` - Create RFQ (Client)
- `GET /api/rfqs` - List RFQs (filtered by role)
- `GET /api/rfqs/:id` - Get RFQ details
- `PATCH /api/rfqs/:id/publish` - Publish RFQ (Admin)
- `DELETE /api/rfqs/:id` - Delete RFQ (if Draft)

### Offers
- `POST /api/offers` - Submit offer (Supplier)
- `GET /api/offers` - List offers (filtered by role)
- `GET /api/offers/:id` - Get offer details
- `PATCH /api/offers/:id` - Update offer (if not Locked)
- `DELETE /api/offers/:id` - Delete offer (if not Locked)

### Negotiations
- `POST /api/negotiations` - Initiate negotiation (Admin)
- `GET /api/negotiations/:id` - Get negotiation details
- `POST /api/negotiations/:id/messages` - Add message/counter-proposal
- `PATCH /api/negotiations/:id/complete` - Complete negotiation

### Orders
- `POST /api/orders` - Create order (after Client acceptance)
- `GET /api/orders` - List orders (filtered by role)
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/payment` - Update payment status (Admin)
- `PATCH /api/orders/:id/delivery` - Update delivery status
- `PATCH /api/orders/:id/finalize` - Finalize order (Admin)

### Dashboard
- `GET /api/dashboard/admin` - Admin dashboard data
- `GET /api/dashboard/client` - Client dashboard data
- `GET /api/dashboard/supplier` - Supplier dashboard data

---

## Notes for Implementation

1. **Start small**: Build one feature at a time, test it, then move to the next
2. **TypeScript first**: Always define types before implementation
3. **Validate early**: Use Zod schemas for both frontend and backend validation
4. **Test locked status**: Create unit tests for all locked status scenarios
5. **Romanian strings**: Maintain a separate i18n file for all Romanian UI strings
6. **Mock data**: Create seed data for testing all user journeys
7. **Error handling**: Implement consistent error messages (in Romanian for UI)
8. **Loading states**: Add loading indicators for all async operations
9. **Confirmation popups**: Standardize popup design and behavior
10. **Status colors**: Keep consistent status color coding across all pages

---

## Success Criteria

The POC is complete when:
- ✅ All three roles can log in and access their dashboards
- ✅ Complete flow works: Client → RFQ → Admin publishes → Supplier offers → Negotiation → Client accepts → Order → Payment → Delivery → Finalized
- ✅ Locked status prevents deletion/modification correctly
- ✅ All deletion attempts show confirmation popups
- ✅ Dashboards show correct data for each role
- ✅ All UI is in Romanian
- ✅ TypeScript compiles without errors
- ✅ Basic tests pass
- ✅ Application is deployable

