# Booking 50% Deposit Payment System

## Overview
The booking payment system has been updated to implement a two-stage payment process:
1. **50% Deposit** - Paid when booking is confirmed
2. **50% Balance** - Paid when service is completed

## Database Schema Changes

### Booking Model (`booking.model.ts`)
Added new fields to track deposit and balance payments:
- `paymentStatus`: Updated enum to include `'deposit_paid'` status
  - `'pending'` - No payment made
  - `'deposit_paid'` - 50% deposit paid
  - `'paid'` - Fully paid (both deposit and balance)
  - `'failed'` - Payment failed
  - `'cancelled'` - Payment cancelled
  - `'refunded'` - Payment refunded

- `depositInvoiceId`: Reference to deposit invoice
- `depositPaidAt`: Timestamp when deposit was paid
- `balanceInvoiceId`: Reference to balance invoice
- `balancePaidAt`: Timestamp when balance was paid

### Invoice Model (`invoice.model.ts`)
Added new field:
- `invoiceType`: Enum to distinguish invoice types
  - `'full'` - Full payment invoice (legacy)
  - `'deposit'` - 50% deposit invoice
  - `'balance'` - 50% balance invoice

## Payment Flow

### 1. Deposit Payment (50%)
**Trigger**: When booking is confirmed and user requests payment

**Method**: `BookingService.createBookingPayment({ bookingId, userId })`

**Process**:
1. Validates booking is confirmed
2. Validates quote is accepted (if quotable service)
3. Creates Stripe invoice with all service items and fees
4. Applies 50% discount (balance due on completion)
5. Sends invoice to customer
6. Updates booking with deposit invoice details

**Result**:
- Stripe invoice created for 50% of total amount
- Invoice type marked as `'deposit'`
- Booking `paymentStatus` remains `'pending'` until payment received
- Customer receives email with invoice link

### 2. Deposit Payment Webhook
**Trigger**: Stripe webhook `invoice.paid` event

**Process**:
1. Identifies invoice type from metadata
2. Updates booking `paymentStatus` to `'deposit_paid'`
3. Records `depositPaidAt` timestamp
4. Links `depositInvoiceId` to booking
5. Sends confirmation emails to customer and distributor

**Result**:
- Booking status: `'confirmed'`
- Payment status: `'deposit_paid'`
- Service can now be delivered

### 3. Service Completion
**Trigger**: Distributor marks service as completed

**Method**: `BookingService.updateCompletedStatus({ bookingId, userId, userRole, completedStatus: 'request_completed' })`

**Validation**:
- Deposit must be paid (`paymentStatus === 'deposit_paid'`)
- Only distributor can mark as completed

**Process**:
1. Updates `completedStatus` to `'request_completed'`
2. Notifies customer that service is complete and balance is due
3. Customer can now request balance invoice

**Result**:
- Customer receives notification to pay balance and confirm completion

### 4. Balance Payment (50%)
**Trigger**: Customer requests balance invoice after service completion

**Method**: `BookingService.createBalancePayment({ bookingId, userId })`

**Validation**:
- Deposit must be paid
- Booking must be completed
- Balance invoice not already created

**Process**:
1. Calculates remaining 50% (service total + platform fee)
2. Creates Stripe invoice for balance amount
3. Sends invoice to customer
4. Updates booking with balance invoice details

**Result**:
- Stripe invoice created for remaining 50%
- Invoice type marked as `'balance'`
- Customer receives email with balance invoice link

### 5. Balance Payment Webhook
**Trigger**: Stripe webhook `invoice.paid` event for balance

**Process**:
1. Identifies invoice type as `'balance'`
2. Updates booking `paymentStatus` to `'paid'`
3. Records `balancePaidAt` timestamp
4. Links `balanceInvoiceId` to booking
5. Sends confirmation emails

**Result**:
- Booking fully paid
- Customer can now confirm service completion

### 6. Final Confirmation
**Trigger**: Customer confirms service completion

**Method**: `BookingService.updateCompletedStatus({ bookingId, userId, userRole, completedStatus: 'completed' })`

**Validation**:
- Balance must be paid (`paymentStatus === 'paid'`)
- Only customer can confirm completion

**Process**:
1. Updates booking `status` to `'completed'`
2. Records `completedAt` timestamp
3. Triggers distributor payout
4. Notifies distributor of completion

**Result**:
- Booking fully completed
- Distributor receives payout

## API Endpoints

### Create Deposit Invoice
```typescript
POST /api/bookings/:id/payment
Authorization: Bearer <user_token>

Response:
{
  success: true,
  message: 'Payment invoice created successfully',
  data: {
    invoiceUrl: string,
    invoiceId: string,
    status: 'pending',
    dueDate: number,
    amount: number,
    invoiceType: 'deposit'
  }
}
```

### Create Balance Invoice
```typescript
POST /api/bookings/:id/balance-payment
Authorization: Bearer <user_token>

Response:
{
  success: true,
  message: 'Balance invoice created successfully',
  data: {
    invoiceUrl: string,
    invoiceId: string,
    status: 'pending',
    dueDate: number,
    amount: number,
    invoiceType: 'balance'
  }
}
```

### Mark Service as Completed (Distributor)
```typescript
PATCH /api/bookings/:id/completed-status
Authorization: Bearer <distributor_token>
Body: {
  completedStatus: 'request_completed'
}

Response:
{
  success: true,
  message: 'Completed status updated successfully',
  code: 'STATUS_UPDATED',
  data: { /* booking object */ }
}
```

### Confirm Service Completion (Customer)
```typescript
PATCH /api/bookings/:id/completed-status
Authorization: Bearer <user_token>
Body: {
  completedStatus: 'completed'
}

Response:
{
  success: true,
  message: 'Completed status updated successfully',
  code: 'STATUS_UPDATED',
  data: { /* booking object */ }
}
```

## Payment Status Transitions

```
pending → deposit_paid → paid
   ↓           ↓          ↓
cancelled   cancelled  refunded
```

## Completed Status Transitions

```
pending → request_completed → completed
   ↓              ↓
   ↓          rejected
   ↓              ↓
   ↓          request_completed (resubmit)
```

## Email Notifications

### Deposit Invoice Created
- **To**: Customer
- **Subject**: "50% Deposit Invoice Ready"
- **Content**: Invoice link, amount, due date, note about balance

### Deposit Payment Received
- **To**: Customer
- **Subject**: "Payment Confirmation - 50% Deposit"
- **Content**: Confirmation, booking details, note about balance due on completion

- **To**: Distributor
- **Subject**: "Payment Received - Deposit (50%)"
- **Content**: Payment details, customer info, proceed with service

### Service Completed
- **To**: Customer
- **Subject**: "Service Completed - Balance Payment Due"
- **Content**: Service complete, request to pay balance and confirm

### Balance Invoice Created
- **To**: Customer
- **Subject**: "Balance Payment Due"
- **Content**: Invoice link, remaining amount, due date

### Balance Payment Received
- **To**: Customer
- **Subject**: "Payment Confirmation - Final Balance (50%)"
- **Content**: Confirmation, thank you, request to confirm completion

- **To**: Distributor
- **Subject**: "Payment Received - Balance (50%)"
- **Content**: Payment details, booking fully paid

## Error Handling

### Common Errors
- `"Booking must be confirmed before payment"` - Booking not in confirmed status
- `"Quote must be accepted before payment"` - Quotable service without accepted quote
- `"This booking has already been fully paid"` - Attempting to create duplicate invoice
- `"Deposit must be paid before requesting balance invoice"` - Balance requested before deposit
- `"Booking must be completed before balance payment"` - Balance requested before service completion
- `"Deposit must be paid before marking service as done"` - Distributor trying to complete without deposit

## Platform Fee Distribution

### Deposit Invoice (50% of total)
- Service/Quote Items: 50% of total
- Platform Fee: 50% of total fee (5% of service total)
- **Total Deposit**: 50% × (Service Total + Platform Fee)

### Balance Invoice (50% of total)
- Balance Amount: 50% of total
- Platform Fee: 50% of total fee (5% of service total)
- **Total Balance**: 50% × (Service Total + Platform Fee)

## Distributor Payout

Payout is triggered when:
1. Balance payment is received (`paymentStatus === 'paid'`)
2. Customer confirms completion (`completedStatus === 'completed'`)

Payout amount:
- Deposit portion: 50% of service total - 50% of platform fee
- Balance portion: 50% of service total - 50% of platform fee
- **Total Payout**: Service Total - Platform Fee

## Migration Notes

### Existing Bookings
- Existing bookings with `paymentStatus === 'paid'` are considered fully paid
- No migration needed for completed bookings
- Pending bookings will use new deposit system going forward

### Backward Compatibility
- System checks for `invoiceType` field
- If not present, treats as legacy full payment
- Webhook handler supports both old and new payment flows

## Testing Checklist

- [ ] Create booking with quotable service
- [ ] Accept quote
- [ ] Generate deposit invoice
- [ ] Pay deposit via Stripe
- [ ] Verify deposit payment webhook updates booking
- [ ] Distributor marks service as completed
- [ ] Generate balance invoice
- [ ] Pay balance via Stripe
- [ ] Verify balance payment webhook updates booking
- [ ] Customer confirms completion
- [ ] Verify distributor payout triggered
- [ ] Test cancellation at each stage
- [ ] Test rejection of completion
- [ ] Test email notifications at each stage
