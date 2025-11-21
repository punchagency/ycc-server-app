export interface CreateServiceDTO {
    name: string;
    description?: string;
    price: number;
    businessId: string;
    categoryId: string;
    isQuotable?: boolean;
}

export interface UpdateServiceDTO {
    name?: string;
    description?: string;
    price?: number;
    categoryId?: string;
    isQuotable?: boolean;
}
export interface BulkServiceInput {
    name: string;
    description?: string;
    price: number;
    categoryName: string;
    isQuotable?: boolean;
}
