/** Shapes returned by the visit-log API. Mirrors server/src/models. */

export type Paged<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SchoolRow = {
  udiseCode: string;
  schoolName: string;
  clusterName: string | null;
  blockName: string | null;
};

export type QuestionType = 'yesNo' | 'number' | 'singleChoice' | 'text';

export type Question = {
  questionId: string;
  type: QuestionType;
  text: string;
  min?: number | null;
  max?: number | null;
  maxLength?: number | null;
  options?: string[];
  optional?: boolean;
};

export type Questionnaire = {
  year: number;
  month: number;
  title: string;
  questions: Question[];
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AnswerValue = boolean | number | string;

export type Answer = { questionId: string; value: AnswerValue };

export type ServerVisit = {
  _id: string;
  clientId: string;
  userId: string;
  udiseCode: string;
  schoolName: string;
  districtCode: string;
  blockCode: string;
  clusterCode: string;
  visitedAt: string;
  year: number;
  month: number;
  answers: Answer[];
  createdAt: string;
  updatedAt: string;
};

export type BlockSummaryRow = {
  blockCode: string;
  blockName: string;
  totalSchools: number;
  schoolsVisited: number;
  uniqueVisitors: number;
  visits: number;
  coveragePercent: number;
};

export type DistrictTotal = Omit<BlockSummaryRow, 'blockCode' | 'blockName'>;

export type BlockSummary = {
  districtCode: string;
  year: number;
  month: number;
  blocks: BlockSummaryRow[];
  districtTotal: DistrictTotal;
};

export type HealthStatus = { status: string; database: string; time: string };
