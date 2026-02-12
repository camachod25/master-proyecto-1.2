export interface AddItemToOrderRequest {
  orderId: string;
  sku: string;
  currency: string;
  quantity: number;
}

export interface AddItemToOrderResponse {
  orderId: string;
  itemCount: number;
  total: number;
  currency: string;
}
