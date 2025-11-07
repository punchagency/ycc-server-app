export interface AddToCartDTO {
    productId: string;
    quantity: number;
}

export interface UpdateCartItemDTO {
    productId: string;
    quantity: number;
}

export interface RemoveFromCartDTO {
    productId: string;
}
