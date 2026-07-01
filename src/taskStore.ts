import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, QuadrantType } from './types';

const STORAGE_KEY = 'eisenhower-matrix-tasks';

// Fetch tasks from local storage (wrapped in async for React Query compatibility)
const fetchTasksFromStorage = async (): Promise<Task[]> => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

// Save tasks to local storage
const saveTasksToStorage = async (tasks: Task[]): Promise<void> => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

// React Query hooks
export const useTasks = () => {
  return useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: fetchTasksFromStorage,
  });
};

export const useAddTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      const currentTasks = await fetchTasksFromStorage();
      const newTask: Task = {
        id: crypto.randomUUID(),
        text,
        completed: false,
        quadrant: 'pool',
        createdAt: Date.now(),
      };
      const updatedTasks = [newTask, ...currentTasks];
      await saveTasksToStorage(updatedTasks);
      return updatedTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; completed?: boolean; quadrant?: QuadrantType; text?: string }) => {
      const currentTasks = await fetchTasksFromStorage();
      const updatedTasks = currentTasks.map((t) => {
        if (t.id === payload.id) {
          return {
            ...t,
            ...(payload.completed !== undefined ? { completed: payload.completed } : {}),
            ...(payload.quadrant !== undefined ? { quadrant: payload.quadrant } : {}),
            ...(payload.text !== undefined ? { text: payload.text } : {}),
          };
        }
        return t;
      });
      await saveTasksToStorage(updatedTasks);
      return updatedTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const currentTasks = await fetchTasksFromStorage();
      const updatedTasks = currentTasks.filter((t) => t.id !== id);
      await saveTasksToStorage(updatedTasks);
      return updatedTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
