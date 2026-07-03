export type QuadrantType =
  | 'pool'
  | 'urgent-important'
  | 'important-not-urgent'
  | 'urgent-not-important'
  | 'not-urgent-not-important';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  quadrant: QuadrantType;
  createdAt: number;
  completedAt?: number;
}
