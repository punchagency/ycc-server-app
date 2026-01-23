# Booking 50% Deposit System - Quick Reference

## Implementation Summary

### ✅ Files Modified
1. `src/models/booking.model.ts` - Added deposit/balance tracking fields
2. `src/models/invoice.model.ts` - Added invoiceType field
3. `src/service/booking.service.ts` - Added createBalancePayment method
4. `src/controller/booking.controller.ts` - Added createBalancePayment controller
5. `src/routes/booking.route.ts` - Added balance payment route
6. `src/webhooks/stripe.webhook.ts` - Updated to handle deposit/balance payments

### 🔄 Payment Flow

```
1. Booking Created (status: pending, paymentStatus: pending)
   ↓
2. Booking Confirmed (status: confirmed, paymentStatus: pending)
   ↓
3. POST /api/bookings/:id/payment → Creates 50% deposit invoice
   ↓
4. Customer pays deposit → Webhook updates (paymentStatus: deposit_paid)
   ↓
5. Service delivered by distributor
   ↓
6. PATCH /api/bookings/:id/completed-status (completedStatus: request_completed)
   ↓
7. POST /api/bookings/:id/balance-payment → Creates 50% balance invoice
   ↓
8. Customer pays balance → Webhook updates (paymentStatus: paid)
   ↓
9. PATCH /api/bookings/:id/completed-status (completedStatus: completed)
   ↓
10. Distributor receives payout
```

### 📍 API Endpoints

| Method | Endpoint | Purpose | Who Can Call |
|--------|----------|---------|--------------|
| POST | `/api/bookings/:id/payment` | Create 50% deposit invoice | Customer |
| POST | `/api/bookings/:id/balance-payment` | Create 50% balance invoice | Customer |
| PATCH | `/api/bookings/:id/completed-status` | Update completion status | Distributor/Customer |

### 🔐 Payment Status Values

- `pending` - No payment made
- `deposit_paid` - 50% deposit paid, service can be delivered
- `paid` - Fully paid (both deposit and balance)
- `failed` - Payment failed
- `cancelled` - Payment cancelled
- `refunded` - Payment refunded

### 📊 Completed Status Values

- `pending` - Service not yet completed
- `request_completed` - Distributor marked as complete, awaiting customer confirmation
- `completed` - Customer confirmed completion
- `rejected` - Customer rejected completion claim

### 💰 Invoice Breakdown

**Deposit Invoice (50%)**
```
Service/Items Total: $1000
Platform Fee (10%): $100
Subtotal: $1100
Deposit (50%): $550
Discount: -$550
Total Due: $550
```

**Balance Invoice (50%)**
```
Balance Amount: $550
Total Due: $550
```

### 🎯 Key Validations

**Deposit Payment:**
- ✓ Booking must be confirmed
- ✓ Quote must be accepted (if quotable)
- ✓ Not already fully paid

**Balance Payment:**
- ✓ Deposit must be paid
- ✓ Booking must be completed (request_completed status)
- ✓ Balance invoice not already created

**Mark as Completed (Distributor):**
- ✓ Deposit must be paid
- ✓ Only distributor can mark

**Confirm Completion (Customer):**
- ✓ Balance must be paid
- ✓ Status must be request_completed
- ✓ Only customer can confirm

### 📧 Email Notifications

| Event | Recipient | Subject |
|-------|-----------|---------|
| Deposit invoice created | Customer | "50% Deposit Invoice Ready" |
| Deposit paid | Customer | "Payment Confirmation - 50% Deposit" |
| Deposit paid | Distributor | "Payment Received - Deposit (50%)" |
| Service completed | Customer | "Service Completed - Balance Payment Due" |
| Balance invoice created | Customer | "Balance Payment Due" |
| Balance paid | Customer | "Payment Confirmation - Final Balance (50%)" |
| Balance paid | Distributor | "Payment Received - Balance (50%)" |

### 🧪 Testing Flow

```bash
# 1. Create booking
POST /api/bookings
Body: { serviceId, serviceLocation, dateTime, ... }

# 2. Confirm booking (distributor)
PATCH /api/bookings/:id/status
Body: { status: "confirmed" }

# 3. Create deposit invoice
POST /api/bookings/:id/payment

# 4. Pay deposit in Stripe (use hosted invoice URL)

# 5. Mark service as completed (distributor)
PATCH /api/bookings/:id/completed-status
Body: { completedStatus: "request_completed" }

# 6. Create balance invoice
POST /api/bookings/:id/balance-payment

# 7. Pay balance in Stripe (use hosted invoice URL)

# 8. Confirm completion (customer)
PATCH /api/bookings/:id/completed-status
Body: { completedStatus: "completed" }
```

### 🐛 Common Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Booking must be confirmed before payment" | Booking not confirmed | Confirm booking first |
| "Quote must be accepted before payment" | Quote not accepted | Accept quote first |
| "This booking has already been fully paid" | Duplicate payment attempt | Check payment status |
| "Deposit must be paid before requesting balance invoice" | Balance requested too early | Pay deposit first |
| "Booking must be completed before balance payment" | Service not marked complete | Distributor must mark as completed |
| "Deposit must be paid before marking service as done" | Trying to complete without deposit | Customer must pay deposit |

### 🔍 Database Queries

**Check payment status:**
```javascript
const booking = await BookingModel.findById(bookingId);
console.log(booking.paymentStatus); // 'pending' | 'deposit_paid' | 'paid'
```

**Get deposit invoice:**
```javascript
const depositInvoice = await InvoiceModel.findById(booking.depositInvoiceId);
```

**Get balance invoice:**
```javascript
const balanceInvoice = await InvoiceModel.findById(booking.balanceInvoiceId);
```

### 🔄 Backward Compatibility

The system is backward compatible with existing bookings:
- Old bookings with `paymentStatus: 'paid'` are treated as fully paid
- Webhook checks for `invoiceType` field
- If `invoiceType` is missing, treats as legacy full payment
- No migration required for existing data
