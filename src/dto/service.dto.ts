export interface CreateServiceDTO {
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    businessId: string;
    categoryId: string;
    isQuotable?: boolean;
}

export interface UpdateServiceDTO {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    categoryId?: string;
    isQuotable?: boolean;
}
export interface BulkServiceInput {
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    categoryName: string;
    isQuotable?: boolean;
}
