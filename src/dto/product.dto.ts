export interface CreateProductDTO {
    name: string;
    price: number;
    category: string;
    sku?: string;
    quantity: number;
    minRestockLevel: number;
    description?: string;
    wareHouseAddress: {
        street?: string;
        zipcode?: string;
        city?: string;
        state: string;
        country: string;
    };
    hsCode: string;
    weight: number;
    length: number;
    width: number;
    height: number;
}

export interface UpdateProductDTO {
    name?: string;
    price?: number;
    category?: string;
    sku?: string;
    quantity?: number;
    minRestockLevel?: number;
    description?: string;
    wareHouseAddress?: {
        street?: string;
        zipcode?: string;
        city?: string;
        state?: string;
        country?: string;
    };
    hsCode?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
}

export interface ProductSearchDTO {
    name?: string;
    businessId?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
}

export interface UpdateStockDTO {
    quantity: number;
}