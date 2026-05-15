export type Manuscript = {
  id: string;
  title: string;
  filename: string;
  file_size_bytes: number;
  created_at: string;
  has_extracted_text: boolean;
};

export type AnalysisItem = {
  category: string;
  title: string;
  description: string;
  severity?: "high" | "medium" | "low";
  priority?: "high" | "medium" | "low";
};

export type AnalysisReport = {
  id: string;
  manuscript_id: string;
  overall_summary: string;
  strengths: AnalysisItem[];
  weaknesses: AnalysisItem[];
  recommendations: AnalysisItem[];
  created_at: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DefenseMessage = {
  role: "examiner" | "student";
  content: string;
};

export type DefenseSessionSummary = {
  id: string;
  score: number | null;
  summary: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type RevisionSection = {
  panelist_comment: string;
  section_name: string;
  original_text: string;
  revised_text: string;
  explanation: string;
};

export type PanelistRevision = {
  id: string;
  panelist_comments: string;
  revised_sections: RevisionSection[];
  created_at: string;
};
