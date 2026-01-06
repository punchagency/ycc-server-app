import { Schema, model, Document } from 'mongoose';

export const BUSINESS_TYPE = ['distributor', 'manufacturer'] as const;
export interface IBusiness extends Document {
    _id: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    businessName: string;
    website: string;
    address: {
        street: string;
        zipcode: string;
        city: string;
        state: string;
        country: string;
    },
    email: string;
    phone: string;
    taxId?: string;
    ratings: {
        averageRating: number;
        totalReviews: number;
        totalRatings: number;
    },
    stripeAccountId?: string;
    stripeAccountLink?: string;
    stripeChargesEnabled?: boolean;
    stripedetailsSubmitted?: boolean;
    stripeTransfersEnabled?: boolean;
    license?: string;
    isOnboarded: boolean;
    status?: 'pending' | 'approved' | 'rejected';
    businessType: typeof BUSINESS_TYPE[number];
}

const businessSchema = new Schema<IBusiness>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    businessName: {
        type: String,
        required: true,
        trim: true
    },
    businessType: {
        type: String,
        enum: ['distributor', 'manufacturer'],
        default: 'distributor'
    },
    website: {
        type: String,
        required: false,
        trim: true
    },
    address: {
        street: String,
        zipcode: String,
        city: String,
        state: String,
        country: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: false,
        default: null
    },
    taxId: {
        type: String,
        required: false,
        default: null
    },
    ratings: {
        averageRating: Number,
        totalReviews: Number,
        totalRatings: Number
    },
    stripeAccountId: {
        type: String,
        required: false,
        default: null
    },
    stripeAccountLink: {
        type: String,
        required: false,
        default: null
    },
    stripeChargesEnabled: {
        type: Boolean,
        default: false
    },
    stripedetailsSubmitted: {
        type: Boolean,
        default: false
    },
    stripeTransfersEnabled: {
        type: Boolean,
        default: false
    },
    license: {
        type: String,
        required: false,
        default: null
    },
    isOnboarded: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: "pending"
    }
}, {
    timestamps: true
});

businessSchema.index({ businessName: 'text', email: 'text' });
businessSchema.index({ userId: 1 });

export default model<IBusiness>('Business', businessSchema);
