export type ContactRequestDecision = "approved" | "rejected";

export interface ContactRequestItem {
  id: string;
  company: string;
  student: string;
  message: string;
  date: string;
}

export type ContactedState = "direct" | "school";
