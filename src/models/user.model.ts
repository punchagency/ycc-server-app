import { Schema, model, Document } from 'mongoose';

export const ROLES = ['admin', 'user', 'distributor', 'manufacturer'] as const;
export interface IUser extends Document {
  _id: Schema.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePicture: String;
  address: {
    street: string;
    zipcode: string;
    city: string;
    state: string;
    country: string;
  };
  nationality?: string;
  role: typeof ROLES[number];
  password: string;
  refreshToken: string;
  activationCode?: string;
  activationCodeExpires?: Date;
  resetPasswordCode?: string;
  resetPasswordCodeExpires?: Date;
  isVerified: boolean;
  isActive: boolean;
  stripeCustomerId?: string;
  // Business-related fields for distributors/manufacturers
  businessName?: string;
  businessType?: string;
  businessEmail?: string;
  businessPhone?: string;
  website?: string;
  taxId?: string;
  license?: string;
  notificationPreferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    orderUpdates: boolean;
    bookingReminders: boolean;
    inventoryAlerts: boolean;
    marketingCommunications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'distributor', 'manufacturer'],
    default: 'user'
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  refreshToken: {
    type: String,
    default: null
  },
  activationCode: {
    type: String,
    default: null
  },
  activationCodeExpires: {
    type: Date,
    default: null
  },
  resetPasswordCode: {
    type: String,
    default: null
  },
  resetPasswordCodeExpires: {
    type: Date,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  },
  profilePicture: {
    type: String,
    default: null
  },
  address: {
    street: String,
    zipcode: String,
    city: String,
    state: String,
    country: String,
  },
  nationality: String,
  phone: {
    type: String,
    default: null
  },
  // Business-related fields for distributors/manufacturers
  businessName: {
    type: String,
    default: null
  },
  businessType: {
    type: String,
    default: null
  },
  businessEmail: {
    type: String,
    default: null
  },
  businessPhone: {
    type: String,
    default: null
  },
  website: {
    type: String,
    default: null
  },
  taxId: {
    type: String,
    default: null
  },
  license: {
    type: String,
    default: null
  },
  stripeCustomerId: String,
  notificationPreferences: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    bookingReminders: { type: Boolean, default: true },
    inventoryAlerts: { type: Boolean, default: true },
    marketingCommunications: { type: Boolean, default: false },
  },
}, {
  timestamps: true
});

export default model<IUser>('User', userSchema);