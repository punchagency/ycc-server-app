export interface UpdateOrderStatusDto {
    orderId: string;
    status: 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'cancelled';
    reason?: string;
    trackingNumber?: string;
    notes?: string;
}
