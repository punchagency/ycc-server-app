# Stripe Webhook Setup Guide

## Overview
The Stripe webhook handles payment events for orders and bookings in the YCC Server application.

## Webhook Endpoint
```
POST /webhook/stripe
```

## Supported Events
- `invoice.paid` - Payment successfully completed
- `invoice.payment_succeeded` - Payment succeeded (alternative event)
- `invoice.payment_failed` - Payment failed
- `invoice.voided` - Invoice was voided/cancelled

## Setup Instructions

### 1. Get Webhook Secret from Stripe Dashboard
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/webhook/stripe`
4. Select events to listen to:
   - `invoice.paid`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.voided`
5. Copy the webhook signing secret (starts with `whsec_`)

### 2. Configure Environment Variable
Add the webhook secret to your `.env` file:
```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Test Webhook Locally (Development)
Use Stripe CLI to forward webhooks to your local server:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:7000/webhook/stripe

# This will output a webhook signing secret for testing
# Use this secret in your .env file for local development
```

## Metadata Requirements

When creating Stripe invoices, include the following metadata:

### For Orders
```typescript
{
  orderId: "order_id_here",
  transactionType: "order"
}
```

### For Bookings
```typescript
{
  bookingId: "booking_id_here",
  transactionType: "booking"
}
```

## Webhook Flow

### Payment Success Flow
1. Stripe sends `invoice.paid` or `invoice.payment_succeeded` event
2. Webhook verifies signature
3. Updates Invoice status to 'paid' and sets paymentDate
4. Updates Order/Booking paymentStatus to 'paid'
5. Updates Quote status to 'deposit_paid' (for bookings)
6. Adds status history entry
7. Sends confirmation email to user
8. Creates audit log entry

### Payment Failed Flow
1. Stripe sends `invoice.payment_failed` event
2. Webhook verifies signature
3. Updates Invoice status to 'failed'
4. Updates Order/Booking paymentStatus to 'failed'
5. Adds status history entry
6. Sends failure notification email to user
7. Creates audit log entry

### Invoice Voided Flow
1. Stripe sends `invoice.voided` event
2. Webhook verifies signature
3. Updates Invoice status to 'cancelled'
4. Updates Order/Booking paymentStatus to 'cancelled'

## Security
- Webhook signature verification is enforced
- Raw body is preserved for signature validation
- Invalid signatures return 400 error
- All events are logged for audit trail

## Testing

### Test with Stripe CLI
```bash
# Trigger a test payment success event
stripe trigger invoice.paid

# Trigger a test payment failed event
stripe trigger invoice.payment_failed
```

### Manual Testing
1. Create a test order/booking in your application
2. Complete payment using Stripe test card: `4242 4242 4242 4242`
3. Check webhook logs in Stripe Dashboard
4. Verify database updates and email notifications

## Troubleshooting

### Webhook Signature Verification Failed
- Ensure `STRIPE_WEBHOOK_SECRET` is correctly set
- Check that raw body is being passed to webhook handler
- Verify webhook endpoint URL matches Stripe Dashboard configuration

### Events Not Processing
- Check Stripe Dashboard webhook logs for delivery status
- Verify metadata includes required fields (orderId/bookingId, transactionType)
- Check application logs for error messages

### Emails Not Sending
- Verify SendGrid API key is configured
- Check user has valid email address
- Review email sending logs

## Monitoring
- All webhook events are logged using SystemLogs utility
- Audit logs track all payment status changes
- Check `/health` endpoint for system status
