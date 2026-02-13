export interface CreatePaymentRequest {
    orderId: string;
    amount: number;
    currency: string;
    type: string;
}

export interface CreatePaymentResponse {
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
    type: string;
}