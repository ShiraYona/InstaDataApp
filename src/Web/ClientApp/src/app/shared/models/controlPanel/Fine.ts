/** שורת קנס — תואם ל-FineDto בשרת (GET api/Metrics/fines) */
export interface Fine {
  fineId: number;
  payerName: string;
  fineDate: string; // yyyy-MM-dd
  fineReason?: string;
  fineAmount: number;
  isPaid: boolean;
}
