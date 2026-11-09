/** שורת תשלום — תואם ל-PaymentDto בשרת (GET api/Metrics/payments) */
export interface Payment {
  paymentId: number;
  paymentDate: string; // yyyy-MM-dd
  payerName: string;
  paymentsCount: number;
  fullPayment: number;
  paymentDepartment?: string;
}
