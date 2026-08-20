/**
 * Hand-maintained row types for the tables this app touches.
 * Kept deliberately narrow: only the columns the application reads or writes.
 */

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  target_role: string | null;
  source: string;
  created_at: string;
}

export interface CvDocumentRow {
  id: string;
  lead_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  language: string;
  storage_path: string | null;
  extracted_text: string;
  created_at: string;
}

export interface AnalysisRow {
  id: string;
  lead_id: string;
  cv_document_id: string;
  public_token: string;
  overall_score: number;
  potential_score: number;
  classification: string;
  language: string;
  job_description: string | null;
  target_role: string | null;
  score_breakdown: unknown;
  summary: unknown;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FindingRow {
  id: string;
  analysis_id: string;
  finding_key: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  evidence: string | null;
  recommendation: string;
  score_deduction: number;
  before_text: string | null;
  after_text: string | null;
  is_locked: boolean;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  analysis_id: string | null;
  lead_id: string | null;
  provider: string;
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface EmailEventRow {
  id: string;
  analysis_id: string | null;
  recipient: string;
  event_type: string;
  provider_message_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}
