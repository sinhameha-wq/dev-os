export type ContractType = 'NDA' | 'MSA'
export type ContractStatus = 'pending' | 'processing' | 'complete' | 'error'
export type MessageRole = 'user' | 'assistant'
export type FeedbackRating = 'thumbs_up' | 'thumbs_down'

export interface Contract {
  id: string
  user_id: string
  name: string
  type: ContractType
  file_path: string | null
  contract_text: string
  status: ContractStatus
  page_count: number
  word_count: number
  created_at: string
  updated_at: string
}

export interface KeyTerm {
  id: string
  contract_id: string
  user_id: string
  term_name: string
  value: string
  page_number: number
  confidence_score: number
  source_sentence: string
  is_custom: boolean
  is_edited: boolean
  original_value: string | null
  created_at: string
}

export interface ChatSession {
  id: string
  contract_id: string
  user_id: string
  created_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: MessageRole
  content: string
  page_citation: number | null
  created_at: string
}

export interface UserFeedback {
  id: string
  user_id: string
  contract_id: string
  rating: FeedbackRating
  comment: string | null
  created_at: string
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface DashboardStats {
  total: number
  nda: number
  msa: number
}

export interface ContractListItem {
  id: string
  name: string
  type: ContractType
  status: ContractStatus
  page_count: number
  created_at: string
}
