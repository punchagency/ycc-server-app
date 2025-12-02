import { IProduct } from "../models/product.model";

interface BaseTemplateParams {
  headerTitle: string;
  headerSubtitle: string;
  headerIcon: string;
  content: string;
  footerContent: string;
}

interface DeliveryAddress {
  street: string;
  street1?: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface ProductSummary {
  name: string;
  price?: number;
  quantity?: number;
}

interface ShippedEmailParams {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  carrierName: string;
  products: ProductSummary[];
  estimatedDelivery?: string;
  deliveryAddress: DeliveryAddress;
}

interface DeliveredEmailParams {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  products: ProductSummary[];
  deliveryAddress: DeliveryAddress;
}

interface FailedEmailParams {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  carrierName: string;
  products: ProductSummary[];
  failureReason?: string;
}

interface ReturnedEmailParams {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  products: ProductSummary[];
  returnReason?: string;
}

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Generate base email template structure
 */
function generateBaseTemplate({ headerTitle, headerSubtitle, headerIcon, content, footerContent}: BaseTemplateParams) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${headerTitle} - Yacht Crew Center</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.5; color: #333333; background-color: #f5f5f5;">
      
      <!-- Email Container -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
          <td style="padding: 20px 10px;">
            
            <!-- Main Email Table -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0387D9 0%, #0277bd 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <div style="font-size: 32px; margin-bottom: 8px;">${headerIcon}</div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Yacht Crew Center</h1>
                  <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">${headerSubtitle}</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px 20px;">
                  ${content}
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                  ${footerContent}
                  
                  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #6c757d; font-size: 12px;">
                    <p style="margin: 0;">© ${new Date().getFullYear()} Yacht Crew Center. All rights reserved.</p>
                    <p style="margin: 5px 0 0 0;">Professional logistics solutions for yacht crew worldwide.</p>
                  </div>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function generateProductSummary(products: Partial<IProduct>[]) {
  if (!products || products.length === 0) {
    return '<p style="margin: 0; color: #6c757d;">No product details available</p>';
  }

  return products
    .map(
      product => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
      <div>
        <strong style="color: #333333;">${
          product?.name || 'Product'
        }</strong>
        <div style="color: #6c757d; font-size: 14px;">Quantity: ${
          product.quantity || 1
        }</div>
      </div>
      <div style="color: #0387D9; font-weight: 600;">
        ${
          product.price
            ? formatCurrency(product.price * (product.quantity || 1))
            : 'Price TBD'
        }
      </div>
    </div>
  `
    )
    .join('');
}

/**
 * Generate support contact section
 */
function generateSupportSection(urgent = false) {
  const urgentBadge = urgent
    ? '<span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 8px;">URGENT</span>'
    : '';

  return `
    <div style="background-color: ${
      urgent ? '#fff5f5' : '#f0f9ff'
    }; border: 1px solid ${
    urgent ? '#fecaca' : '#bae6fd'
  }; border-radius: 6px; padding: 20px; margin-top: 20px;">
      <h3 style="margin: 0 0 10px 0; color: ${
        urgent ? '#dc2626' : '#0387D9'
      }; font-size: 16px;">
        📞 Need Assistance?${urgentBadge}
      </h3>
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 14px;">
        Our logistics support team is here to help you with any questions or concerns about your shipment.
      </p>
      <div style="display: flex; gap: 15px; flex-wrap: wrap;">
        <a href="mailto:support@yachtcrewcenter.com" style="display: inline-block; background-color: #0387D9; color: white; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: 500;">
          Email Support
        </a>
        <a href="tel:+1-555-YCC-SHIP" style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: 500;">
          Call Now
        </a>
      </div>
      ${
        urgent
          ? '<p style="margin: 15px 0 0 0; color: #dc2626; font-size: 12px; font-weight: 600;">⏰ Urgent matters receive priority handling within 2 hours</p>'
          : ''
      }
    </div>
  `;
}

/**
 * SHIPPED notification email template
 */
export function generateShippedEmailTemplate({customerName, orderNumber, trackingNumber, carrierName, products, estimatedDelivery, deliveryAddress}: ShippedEmailParams) {

  const content = `
    <!-- Greeting -->
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">
      Hi ${customerName},<br>
      Great news! Your order is now on its way to you.
    </p>
    
    <!-- Shipping Status -->
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #0387D9;">
        🚢 Order #${orderNumber} - Shipped!
      </h2>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Tracking Code:</strong> <span style="color: #0387D9; font-weight: 600;">${trackingNumber}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Carrier:</strong> ${carrierName}
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Ship Date:</strong> ${formatDate(new Date())}
          </td>
        </tr>
        ${
          estimatedDelivery
            ? `
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Expected Delivery:</strong> <span style="color: #10b981; font-weight: 600;">${formatDate(
              estimatedDelivery
            )}</span>
          </td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <!-- Products -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333333;">📦 Items in Transit</h3>
      ${generateProductSummary(products)}
    </div>

    <!-- Delivery Address -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333333;">🏠 Delivery Address</h3>
      <p style="margin: 0; color: #333333; line-height: 1.4;">
        ${deliveryAddress.street1 || 'Address not available'}<br>
        ${deliveryAddress.street2 ? deliveryAddress.street2 + '<br>' : ''}
        ${deliveryAddress.city || ''}, ${deliveryAddress.state || ''} ${
    deliveryAddress.zip || ''
  }<br>
        ${deliveryAddress.country || ''}
      </p>
    </div>

    <!-- Next Steps -->
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333333;">📋 What's Next?</h3>
      <ul style="margin: 0; padding-left: 20px; color: #374151;">
        <li style="margin-bottom: 8px;">Track your shipment using the tracking code above</li>
        <li style="margin-bottom: 8px;">You'll receive updates as your package moves through the delivery network</li>
        <li style="margin-bottom: 8px;">Ensure someone is available to receive the package on delivery day</li>
        <li>Contact us immediately if you need to change the delivery address</li>
      </ul>
    </div>
  `;

  const footerContent = `
    <div style="text-align: center;">
      <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">
        Thank you for choosing Yacht Crew Center for your logistics needs!
      </p>
      <p style="margin: 0; color: #6c757d; font-size: 12px;">
        Questions about your shipment? Our support team is here to help.
      </p>
    </div>
    ${generateSupportSection(false)}
  `;

  return generateBaseTemplate({
    headerTitle: 'Order Shipped',
    headerSubtitle: 'Your Package is On Its Way',
    headerIcon: '🚢',
    content,
    footerContent,
  });
}

/**
 * DELIVERED notification email template
 */
export function generateDeliveredEmailTemplate({customerName, orderNumber, trackingNumber, products, deliveryAddress}: DeliveredEmailParams) {

  const content = `
    <!-- Greeting -->
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">
      Hi ${customerName},<br>
      Excellent news! Your order has been delivered successfully.
    </p>
    
    <!-- Delivery Confirmation -->
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #10b981;">
        📦 Order #${orderNumber} - Delivered!
      </h2>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Delivery Date:</strong> <span style="color: #10b981; font-weight: 600;">${formatDate(new Date())}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Tracking Code:</strong> ${trackingNumber}
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">✅ Delivered</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Products Delivered -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333333;">📦 Items Delivered</h3>
      ${generateProductSummary(products)}
    </div>

    <!-- Delivery Location -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333333;">📍 Delivered To</h3>
      <p style="margin: 0; color: #333333; line-height: 1.4;">
        ${deliveryAddress.street1 || 'Address not available'}<br>
        ${deliveryAddress.street2 ? deliveryAddress.street2 + '<br>' : ''}
        ${deliveryAddress.city || ''}, ${deliveryAddress.state || ''} ${
    deliveryAddress.zip || ''
  }<br>
        ${deliveryAddress.country || ''}
      </p>
    </div>

    <!-- Satisfaction -->
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333333;">🌟 How Was Your Experience?</h3>
      <p style="margin: 0 0 15px 0; color: #374151;">
        We hope you're satisfied with your order and our logistics service. Your feedback helps us continue to improve our service for the yacht crew community.
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #374151;">
        <li style="margin-bottom: 8px;">If you have any issues with your delivered items, please contact us within 48 hours</li>
        <li style="margin-bottom: 8px;">Consider leaving a review to help other crew members</li>
        <li>Need another order? We're here to serve your logistics needs</li>
      </ul>
    </div>
  `;

  const footerContent = `
    <div style="text-align: center;">
      <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">
        Thank you for trusting Yacht Crew Center with your logistics needs!
      </p>
      <p style="margin: 0; color: #6c757d; font-size: 12px;">
        We appreciate your business and look forward to serving you again.
      </p>
    </div>
    ${generateSupportSection(false)}
  `;

  return generateBaseTemplate({
    headerTitle: 'Order Delivered',
    headerSubtitle: 'Package Successfully Delivered',
    headerIcon: '📦',
    content,
    footerContent,
  });
}

/**
 * FAILED notification email template
 */
export function generateFailedEmailTemplate({customerName, orderNumber, trackingNumber, carrierName, products, failureReason}: FailedEmailParams) {

  const content = `
    <!-- Greeting -->
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">
      Hi ${customerName},<br>
      We encountered an issue with delivering your order, but our team is working to resolve it immediately.
    </p>
    
    <!-- Delivery Issue -->
    <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #ea580c;">
        🔄 Order #${orderNumber} - Delivery Issue
      </h2>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Issue:</strong> <span style="color: #ea580c;">${
              failureReason || 'Delivery attempt unsuccessful'
            }</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Tracking Code:</strong> ${trackingNumber}
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Carrier:</strong> ${carrierName}
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Status:</strong> <span style="color: #ea580c; font-weight: 600;">⚠️ Retry Required</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Affected Products -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333333;">📦 Affected Items</h3>
      ${generateProductSummary(products)}
    </div>

    <!-- Resolution Steps -->
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333333;">🔧 Our Resolution Plan</h3>
      <ul style="margin: 0; padding-left: 20px; color: #374151;">
        <li style="margin-bottom: 8px;"><strong>Immediate:</strong> Our logistics team has been notified and is coordinating with the carrier</li>
        <li style="margin-bottom: 8px;"><strong>Next 24 hours:</strong> We'll attempt redelivery or coordinate an alternative solution</li>
        <li style="margin-bottom: 8px;"><strong>Communication:</strong> You'll receive updates as we progress</li>
        <li><strong>Backup plan:</strong> If delivery issues persist, we'll arrange for alternative shipping methods</li>
      </ul>
    </div>

    <!-- What You Can Do -->
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #0387D9;">💡 How You Can Help</h3>
      <ul style="margin: 0; padding-left: 20px; color: #374151;">
        <li style="margin-bottom: 8px;">Verify your delivery address is correct and accessible</li>
        <li style="margin-bottom: 8px;">Ensure someone will be available during delivery hours</li>
        <li style="margin-bottom: 8px;">Check with building management about delivery restrictions</li>
        <li>Contact us if you need to update delivery instructions</li>
      </ul>
    </div>
  `;

  const footerContent = `
    <div style="text-align: center;">
      <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">
        We sincerely apologize for any inconvenience and appreciate your patience.
      </p>
      <p style="margin: 0; color: #6c757d; font-size: 12px;">
        Our logistics team is committed to getting your order to you as quickly as possible.
      </p>
    </div>
    ${generateSupportSection(true)}
  `;

  return generateBaseTemplate({
    headerTitle: 'Delivery Issue',
    headerSubtitle: "We're Resolving Your Delivery",
    headerIcon: '🔄',
    content,
    footerContent,
  });
}

/**
 * RETURNED TO SUPPLIER notification email template
 */
export function generateReturnedEmailTemplate({customerName, orderNumber, trackingNumber, products, returnReason}: ReturnedEmailParams) {

  const content = `
    <!-- Greeting -->
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">
      Hi ${customerName},<br>
      Your order has been returned to the supplier for processing. We're working to resolve this situation immediately.
    </p>
    
    <!-- Return Notice -->
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #dc2626;">
        📋 Order #${orderNumber} - Returned to Supplier
        <span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 8px;">URGENT</span>
      </h2>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Return Reason:</strong> <span style="color: #dc2626;">${
              returnReason || 'Package returned for reprocessing'
            }</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Original Tracking:</strong> ${trackingNumber}
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Return Date:</strong> ${formatDate(new Date())}
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px;">
            <strong>Status:</strong> <span style="color: #dc2626; font-weight: 600;">🔄 Being Reprocessed</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Affected Products -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333333;">📦 Returned Items</h3>
      ${generateProductSummary(products)}
    </div>

    <!-- Common Reasons -->
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #0387D9;">❓ Why This Happened</h3>
      <p style="margin: 0 0 10px 0; color: #374151;">Returns to supplier typically occur due to:</p>
      <ul style="margin: 0; padding-left: 20px; color: #374151;">
        <li style="margin-bottom: 8px;">Address verification issues or incomplete delivery information</li>
        <li style="margin-bottom: 8px;">Multiple failed delivery attempts at the destination</li>
        <li style="margin-bottom: 8px;">Customs clearance requirements for international shipments</li>
        <li>Carrier-specific delivery restrictions or access limitations</li>
      </ul>
    </div>

    <!-- Our Action Plan -->
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333333;">🎯 Our Resolution Process</h3>
      <div style="background-color: #fff; border-left: 4px solid #0387D9; padding: 15px; margin-bottom: 15px;">
        <p style="margin: 0; color: #374151;"><strong>Step 1:</strong> Investigation & Root Cause Analysis (24 hours)</p>
      </div>
      <div style="background-color: #fff; border-left: 4px solid #0387D9; padding: 15px; margin-bottom: 15px;">
        <p style="margin: 0; color: #374151;"><strong>Step 2:</strong> Coordinate with Supplier for Reshipment (48 hours)</p>
      </div>
      <div style="background-color: #fff; border-left: 4px solid #0387D9; padding: 15px; margin-bottom: 15px;">
        <p style="margin: 0; color: #374151;"><strong>Step 3:</strong> New Shipment with Corrected Information (72 hours)</p>
      </div>
      <div style="background-color: #fff; border-left: 4px solid #10b981; padding: 15px;">
        <p style="margin: 0; color: #374151;"><strong>Expected Resolution:</strong> 2-3 business days total</p>
      </div>
    </div>

    <!-- Critical Action Required -->
    <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #dc2626;">🚨 Immediate Action Required</h3>
      <p style="margin: 0 0 15px 0; color: #374151; font-weight: 600;">
        Please contact our support team immediately to expedite resolution of your order.
      </p>
      <p style="margin: 0; color: #374151;">
        When contacting support, please reference order #${orderNumber} and tracking code ${trackingNumber} for faster processing.
      </p>
    </div>
  `;

  const footerContent = `
    <div style="text-align: center;">
      <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">
        We sincerely apologize for this disruption to your order delivery.
      </p>
      <p style="margin: 0; color: #6c757d; font-size: 12px;">
        Our team is committed to resolving this matter and getting your order delivered successfully.
      </p>
    </div>
    ${generateSupportSection(true)}
  `;

  return generateBaseTemplate({
    headerTitle: 'Order Returned',
    headerSubtitle: 'Urgent: Support Required',
    headerIcon: '📋',
    content,
    footerContent,
  });
}
