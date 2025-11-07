import { Schema, model, Document } from 'mongoose';

interface IInventory extends Document {
    _id: Schema.Types.ObjectId;
    businessId: Schema.Types.ObjectId;
    products: {
        productId: Schema.Types.ObjectId;
    }[],
    warehouse?: string
}

const inventorySchema = new Schema<IInventory>({
    businessId: { type: Schema.Types.ObjectId, required: true, ref: 'Business' },
    products: [{
        productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' }
    }],
    warehouse: { type: String, required: false }
}, {
    timestamps: true
});

export default model<IInventory>('Inventory', inventorySchema);