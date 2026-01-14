import { ORDER_STATUSES, ORDER_PAYMENT_STATUSES } from "../models/order.model";

export interface UpdateOrderStatusDto {
    orderId: string;
    status: 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'cancelled';
    reason?: string;
    trackingNumber?: string;
    notes?: string;
    enableShipping?: boolean;
    shipmentCost?: number;
    itemPrices?: {
        itemId: string;
        price: number;
        currency: string;
    }[];
}

export interface GetOrdersDto {
    page: number;
    limit: number;
    status?: typeof ORDER_STATUSES[number];
    userId?: string;
    paymentStatus?: typeof ORDER_PAYMENT_STATUSES[number];
    startDate?: Date;
    endDate?: Date;
    sortBy?: string;
    orderBy?: string;
}