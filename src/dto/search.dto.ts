export const GLOBAL_SEARCH_TYPES = [
    "products",
    "users",
    "businesses",
    "orders",
    "bookings",
    "categories",
    "services"
] as const;

export const GLOBAL_SEARCH_STATUSES = [
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'declined',
    'processing',
    'out_for_delivery',
    'shipped',
    'delivered',
    'paid',
    'failed',
    'refunded'
] as const;

export const GLOBAL_SEARCH_SORT_BY = {
    products: ['name', 'price', 'createdAt', 'updatedAt'],
    users: ['firstName', 'lastName', 'email', 'createdAt', 'updatedAt'],
    businesses: ['businessName', 'email', 'createdAt', 'updatedAt'],
    orders: ['totalAmount', 'status', 'createdAt', 'updatedAt'],
    bookings: ['bookingDate', 'status', 'createdAt', 'updatedAt'],
    categories: ['name', 'createdAt', 'updatedAt'],
    services: ['name', 'price', 'createdAt', 'updatedAt']
} as const;

export interface GlobalSearchDTO {
    query?: string;
    type?: typeof GLOBAL_SEARCH_TYPES[number];
    status?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
}