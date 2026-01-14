export interface ExtractedJobDetails {
  companyProfile: string;
  jobDescription: string;
  salaryBudget: string;
  hrContact: string;
  contactEmail: string;
  previousHolder: string;
  possibleManager: string;
  teamMates: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING',
  PARSING = 'PARSING',
  OPTIMIZING = 'OPTIMIZING',
  GENERATING_COVER_LETTER = 'GENERATING_COVER_LETTER',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}