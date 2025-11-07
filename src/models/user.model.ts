import { Schema, model, Document } from 'mongoose';

export const ROLES = ['admin', 'user', 'distributor', 'manufacturer'] as const;
interface IUser extends Document {
  _id: Schema.Types.ObjectId;
  name: string;
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
  role: typeof ROLES[number];
  password: string;
  refreshToken: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: {
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
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
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
  phone: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

export default model<IUser>('User', userSchema);