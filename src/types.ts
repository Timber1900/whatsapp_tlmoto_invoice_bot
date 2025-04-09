import { Request } from 'express';

export interface WhatsAppApprovalRequest {
    phone_reviewer_1: string;
    phone_reviewer_2: string;
    requester_name: string;
    description: string;
    invoice: string;       // URL to the document (PDF, etc.)
    invoice_name: string;  // Display name for the file
    cost: string;  // Display name for the file
  }
  
export type TypedRequestBody<T> = Request<{}, {}, T>;

export function isValidWhatsAppApprovalRequest(obj: any): obj is WhatsAppApprovalRequest {
    const requiredFields = [
      'phone_reviewer_1',
      'phone_reviewer_2',
      'requester_name',
      'description',
      'invoice',
      'invoice_name'
    ];
  
    // Check all fields exist and are strings
    for (const field of requiredFields) {
      if (!(field in obj) || typeof obj[field] !== 'string' || obj[field].trim() === '') {
        return false;
      }
    }
  
    // Check invoice is a URL
    try {
      new URL(obj.invoice);
    } catch {
      return false;
    }
  
    return true;
}

export interface AirtableAttachment {
    id: string;
    url: string;
    filename: string;
    size: number;
    type: string;
}
