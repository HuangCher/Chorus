export interface User {
  id: string;
  email: string;
  name: string;
  householdId?: string;
  strikes: number;
  completedChores: number;
}

export interface Chore {
  id: string;
  householdId: string;
  type: 'dishes' | 'trash' | 'vacuum' | 'laundry' | 'cleanup' | 'grocery';
  assignedTo: string;
  status: 'pending' | 'completed' | 'overdue';
  dueBy: Date;
  triggeredBy: 'sensor' | 'manual';
  createdAt: Date;
}

export interface Household {
  id: string;
  code: string;
  createdAt: Date;
  members: string[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  addedBy: 'sensor' | 'manual';
}