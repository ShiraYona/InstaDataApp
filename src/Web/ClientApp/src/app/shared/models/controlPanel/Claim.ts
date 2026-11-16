/** שורת תביעה — תואם ל-ClaimDto בשרת (GET api/Metrics/claims) */
export interface Claim {
  claimId: number;
  claimDate: string; // yyyy-MM-dd
  claimantName: string;
  claimDescription?: string;
  claimAmount: number;
  claimantsCount: number;
  claimDepartment?: string;
}
