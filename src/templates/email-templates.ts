import { IBusiness } from "../models/business.model";
import { IService } from "../models/service.model";
import { IUser } from "../models/user.model";
import { IProduct } from "../models/product.model";
import CategoryModel from "../models/category.model";

export const generateVendorBookingEmail = async ({ vendor, crew, servicesList, totalPrice, dateTime, serviceLocation, contactPhone, internalNotes, confirmationUrl }: {
  vendor: IBusiness | IUser,
  crew: IUser,
  servicesList: IService[],
  totalPrice: number,
  dateTime: Date,
  serviceLocation: string,
  contactPhone: string,
  internalNotes: string,
  confirmationUrl: string
}) => {
  const servicesWithCategories = await Promise.all(
    servicesList.map(async (s) => {
      const category = await CategoryModel.findById(s.categoryId);
      return { ...s, categoryName: category?.name || 'N/A' };
    })
  );

  const vendorName = 'businessName' in vendor ? vendor.businessName : `${vendor.firstName} ${vendor.lastName}`;

  return `
  <h1>New Booking Requires Confirmation</h1>
  <p>Dear ${vendorName},</p>
  <p>A new booking has been placed for your services by ${crew.firstName} ${crew.lastName} (${crew.email}):</p>
  <table border="1" cellpadding="5" style="border-collapse: collapse;">
    <tr>
      <th>Service</th>
      <th>Category</th>
      <th>Quantity</th>
      <th>Price</th>
      <th>Subtotal</th>
    </tr>
    ${servicesWithCategories
      .map(
        s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.categoryName}</td>
        <td>$${s.price ? s.price.toFixed(2) : '0.00'}</td>
      </tr>
    `
      )
      .join('')}
    <tr>
      <td colspan="4" align="right"><strong>Total:</strong></td>
      <td><strong>$${totalPrice.toFixed(2)}</strong></td>
    </tr>
  </table>
  
  <h3>Booking Information:</h3>
  <p><strong>Date and Time:</strong> ${new Date(dateTime).toLocaleString()}</p>
  <p><strong>Service Location:</strong> ${serviceLocation}</p>
  <p><strong>Contact Phone:</strong> ${contactPhone || 'Not provided'}</p>
  ${internalNotes
      ? `<p><strong>Additional Notes:</strong> ${internalNotes}</p>`
      : ''
    }
  
  <p>Please click the button below to confirm this booking:</p>
  <a href="${confirmationUrl}" style="display:inline-block;background-color:#4CAF50;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
    Confirm Booking
  </a>
  <p>Or copy and paste this URL: ${confirmationUrl}</p>
  <p>This confirmation link will expire in 7 days.</p>
  <p>Thank you for your business!</p>
`
};

export const generateCrewBookingConfirmationEmail = async (
  { crew,
    vendorUser,
    servicesList,
    totalPrice,
    dateTime,
    serviceLocation,
    contactPhone,
    internalNotes
  }: {
    crew: IUser,
    vendorUser: IBusiness | IUser,
    servicesList: IService[],
    totalPrice: number,
    dateTime: Date,
    serviceLocation: string,
    contactPhone: string,
    internalNotes: string
  }) => {
  const servicesWithCategories = await Promise.all(
    servicesList.map(async (s) => {
      const category = await CategoryModel.findById(s.categoryId);
      return { ...s, categoryName: category?.name || 'N/A' };
    })
  );

  const vendorName = 'businessName' in vendorUser ? vendorUser.businessName : `${vendorUser.firstName} ${vendorUser.lastName}`;

  return `
  <h2>Booking Confirmation</h2>
  <p>Dear ${crew.firstName} ${crew.lastName},</p>
  <p>Your booking has been placed successfully:</p>
  <table border="1" cellpadding="5" style="border-collapse: collapse;">
    <tr>
      <th>Service</th>
      <th>Category</th>
      <th>Quantity</th>
      <th>Price</th>
      <th>Subtotal</th>
    </tr>
    ${servicesWithCategories
      .map(
        s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.categoryName}</td>
        <td>$${s.price ? s.price.toFixed(2) : '0.00'}</td>
      </tr>
    `
      )
      .join('')}
    <tr>
      <td colspan="4" align="right"><strong>Total:</strong></td>
      <td><strong>$${totalPrice.toFixed(2)}</strong></td>
    </tr>
  </table>
  
  <h3>Booking Information:</h3>
  <p><strong>Vendor:</strong> ${vendorName}</p>
  <p><strong>Date and Time:</strong> ${new Date(dateTime).toLocaleString()}</p>
  <p><strong>Service Location:</strong> ${serviceLocation}</p>
  <p><strong>Contact Phone:</strong> ${contactPhone || 'Not provided'}</p>
  ${internalNotes
      ? `<p><strong>Additional Notes:</strong> ${internalNotes}</p>`
      : ''
    }
  <p>Your booking is pending confirmation from the vendor. You will be notified once confirmed.</p>
  <p>Thank you for your booking!</p>
`
};

export const generateOrderConfirmationEmail = async ({
  supplier,
  customerName,
  products,
  totalPrice,
  deliveryDate,
  deliveryAddress,
  additionalNotes,
  confirmationUrl
}: {
  supplier: IBusiness | IUser,
  customerName: string,
  products: IProduct[],
  totalPrice: number,
  deliveryDate: Date,
  deliveryAddress: string,
  additionalNotes: string,
  confirmationUrl: string
}) => {
  const productsWithCategories = await Promise.all(
    products.map(async (p) => {
      const category = await CategoryModel.findById(p.category);
      return { ...p, categoryName: category?.name || 'N/A' };
    })
  );

  const supplierName = 'businessName' in supplier ? supplier.businessName : `${supplier.firstName} ${supplier.lastName}`;

  return `
  <h1>New Order Requires Confirmation</h1>
  <p>Dear ${supplierName},</p>
  <p>A new order has been placed for your products${customerName ? ` by ${customerName}` : ''}:</p>
  <table border="1" cellpadding="5" style="border-collapse: collapse;">
    <tr>
      <th>Product</th>
      <th>Category</th>
      <th>Quantity</th>
      <th>Price</th>
      <th>Subtotal</th>
    </tr>
    ${productsWithCategories
      .map(
        p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.categoryName}</td>
        <td>${p.quantity}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>$${(p.price * p.quantity).toFixed(2)}</td>
      </tr>
    `
      )
      .join('')}
    <tr>
      <td colspan="4" align="right"><strong>Total:</strong></td>
      <td><strong>$${totalPrice.toFixed(2)}</strong></td>
    </tr>
  </table>
  
  <h3>Delivery Information:</h3>
  <p><strong>Delivery Address:</strong> ${deliveryAddress}</p>
  <p><strong>Estimated Delivery Date:</strong> ${new Date(
        deliveryDate
      ).toLocaleDateString()}</p>
  ${additionalNotes
      ? `<p><strong>Additional Notes:</strong> ${additionalNotes}</p>`
      : ''
    }
  
  <p>Please click the button below to confirm this order:</p>
  <a href="${confirmationUrl}" style="display:inline-block;background-color:#4CAF50;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
    Confirm Order
  </a>
  <p>Or copy and paste this URL: ${confirmationUrl}</p>
  <p>This confirmation link will expire in 7 days.</p>
  <p>Thank you for your business!</p>
`
};

export const generateUserOrderConfirmationEmail = async ({
  supplier,
  crew,
  products,
  totalPrice,
  deliveryDate,
  deliveryAddress,
  additionalNotes,
  confirmationUrl
}: {
  supplier: IBusiness | IUser,
  crew: IUser,
  products: IProduct[],
  totalPrice: number,
  deliveryDate: Date,
  deliveryAddress: string,
  additionalNotes: string,
  confirmationUrl: string
}) => {
  const productsWithCategories = await Promise.all(
    products.map(async (p) => {
      const category = await CategoryModel.findById(p.category);
      return { ...p, categoryName: category?.name || 'N/A' };
    })
  );

  const supplierName = 'businessName' in supplier ? supplier.businessName : `${supplier.firstName} ${supplier.lastName}`;

  return `
  <h1>New Order Requires Confirmation</h1>
  <p>Dear ${supplierName},</p>
  <p>A new order has been placed for your products by ${crew.firstName} ${crew.lastName}:</p>
  <table border="1" cellpadding="5" style="border-collapse: collapse;">
    <tr>
      <th>Product</th>
      <th>Category</th>
      <th>Quantity</th>
      <th>Price</th>
      <th>Subtotal</th>
    </tr>
    ${productsWithCategories
      .map(
        p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.categoryName}</td>
        <td>${p.quantity}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>$${(p.price * p.quantity).toFixed(2)}</td>
      </tr>
    `
      )
      .join('')}
    <tr>
      <td colspan="4" align="right"><strong>Total:</strong></td>
      <td><strong>$${totalPrice.toFixed(2)}</strong></td>
    </tr>
  </table>
  
  <h3>Delivery Information:</h3>
  <p><strong>Delivery Address:</strong> ${deliveryAddress}</p>
  <p><strong>Estimated Delivery Date:</strong> ${new Date(
        deliveryDate
      ).toLocaleDateString()}</p>
  ${additionalNotes
      ? `<p><strong>Additional Notes:</strong> ${additionalNotes}</p>`
      : ''
    }
  
  <p>Please click the button below to confirm this order:</p>
  <a href="${confirmationUrl}" style="display:inline-block;background-color:#4CAF50;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
    Confirm Order
  </a>
  <p>Or copy and paste this URL: ${confirmationUrl}</p>
  <p>This confirmation link will expire in 7 days.</p>
  <p>Thank you for your business!</p>
`
};
