export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
  walletBalance: number;
  hasClaimedFreeCash: boolean;
  createdAt: Date;
  lastUpdated: Date;
}
