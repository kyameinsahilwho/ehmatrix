import React, { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Check,
  ListTodo,
  AlertCircle,
  Calendar,
  Users,
  Activity,
  ArrowRight,
  Info,
  Sun,
  Moon,
  GripVertical,
  Archive,
  RotateCcw,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  useTasks,
  useAddTask,
  useUpdateTask,
  useDeleteTask
} from './taskStore';
import type { QuadrantType, Task } from './types';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

interface TaskItemProps {
  task: Task;
  draggedTaskId: string | null;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  handleDragEnd: () => void;
  updateTaskMutation: any;
  onRequestDelete: (task: Task) => void;
}

function TaskItem({
  task,
  draggedTaskId,
  handleDragStart,
  handleDragEnd,
  updateTaskMutation,
  onRequestDelete,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [isTextHovered, setIsTextHovered] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== task.text) {
      updateTaskMutation.mutate({ id: task.id, text: trimmed });
    } else {
      setEditText(task.text);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(task.text);
      setIsEditing(false);
    }
  };

  return (
    <div
      draggable={!isEditing && !isTextHovered}
      onDragStart={(e) => handleDragStart(e, task.id)}
      onDragEnd={handleDragEnd}
      className={`task-item ${draggedTaskId === task.id ? 'dragging' : ''} ${isEditing ? 'editing' : ''}`}
    >
      <div className="task-content-left">
        <div className="drag-handle">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <button
          type="button"
          onClick={() => {
            const nextCompleted = !task.completed;
            updateTaskMutation.mutate({ id: task.id, completed: nextCompleted });
            if (nextCompleted) {
              confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.8 }
              });
            }
          }}
          className={`task-checkbox-btn ${task.completed ? 'completed' : ''}`}
          aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
        >
          {task.completed && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
        </button>
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="task-edit-input"
          />
        ) : (
          <span
            onClick={() => {
              setIsEditing(true);
              setEditText(task.text);
            }}
            onMouseEnter={() => setIsTextHovered(true)}
            onMouseLeave={() => setIsTextHovered(false)}
            className={`task-text editable-task-text ${task.completed ? 'completed' : ''}`}
            title="Click to edit task name"
          >
            {task.text}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRequestDelete(task)}
        className="delete-btn"
        aria-label="Delete task"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function MatrixAppContent() {
  const [taskText, setTaskText] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDragOverQuadrant, setActiveDragOverQuadrant] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync theme with HTML class
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Focus shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Queries & Mutations
  const { data: tasks = [], isLoading } = useTasks();
  const addTaskMutation = useAddTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    addTaskMutation.mutate(taskText.trim());
    setTaskText('');
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDragOverQuadrant(null);
  };

  const handleDragOver = (e: React.DragEvent, quadrant: QuadrantType) => {
    e.preventDefault();
    if (activeDragOverQuadrant !== quadrant) {
      setActiveDragOverQuadrant(quadrant);
    }
  };

  const handleDragLeave = () => {
    setActiveDragOverQuadrant(null);
  };

  const handleDrop = (e: React.DragEvent, targetQuadrant: QuadrantType) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (id) {
      updateTaskMutation.mutate({ id, quadrant: targetQuadrant });
    }
    setDraggedTaskId(null);
    setActiveDragOverQuadrant(null);
  };

  // Group tasks by quadrant (only active/uncompleted tasks)
  const getTasksByQuadrant = (quadrant: QuadrantType) => {
    return tasks.filter((t) => t.quadrant === quadrant && !t.completed);
  };

  const poolTasks = getTasksByQuadrant('pool');

  const completedTasks = tasks.filter((t) => t.completed);

  const getGroupedCompletedTasks = () => {
    const groups: { [key: string]: Task[] } = {};
    completedTasks.forEach((task) => {
      const dateVal = task.completedAt || task.createdAt || Date.now();
      const dateStr = new Date(dateVal).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(task);
    });
    return Object.keys(groups)
      .sort((a, b) => {
        const timeA = groups[a][0].completedAt || groups[a][0].createdAt || 0;
        const timeB = groups[b][0].completedAt || groups[b][0].createdAt || 0;
        return timeB - timeA;
      })
      .map((dateStr) => ({
        date: dateStr,
        tasks: groups[dateStr].sort((a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt)),
      }));
  };

  const handleClearArchive = () => {
    if (window.confirm("Are you sure you want to permanently delete all completed tasks?")) {
      completedTasks.forEach((task) => {
        deleteTaskMutation.mutate(task.id);
      });
    }
  };

  // Matrix configuration helper for UI rendering
  const quadrantsConfig: {
    id: QuadrantType;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    colorVar: string;
    colorRgbVar: string;
  }[] = [
    {
      id: 'urgent-important',
      title: 'Urgent & Important',
      subtitle: 'Do it now. Immediate actions needed.',
      icon: <AlertCircle className="w-5 h-5" />,
      colorVar: 'var(--q-urgent-important)',
      colorRgbVar: 'var(--q-urgent-important-rgb)',
    },
    {
      id: 'important-not-urgent',
      title: 'Important & Not Urgent',
      subtitle: 'Schedule it. Plan time to execute.',
      icon: <Calendar className="w-5 h-5" />,
      colorVar: 'var(--q-important-not-urgent)',
      colorRgbVar: 'var(--q-important-not-urgent-rgb)',
    },
    {
      id: 'urgent-not-important',
      title: 'Urgent & Not Important',
      subtitle: 'Delegate it. Who can do this for you?',
      icon: <Users className="w-5 h-5" />,
      colorVar: 'var(--q-urgent-not-important)',
      colorRgbVar: 'var(--q-urgent-not-important-rgb)',
    },
    {
      id: 'not-urgent-not-important',
      title: 'Not Urgent & Not Important',
      subtitle: 'Eliminate it. Drop or archive it.',
      icon: <Activity className="w-5 h-5" />,
      colorVar: 'var(--q-not-urgent-not-important)',
      colorRgbVar: 'var(--q-not-urgent-not-important-rgb)',
    },
  ];

  const renderTask = (task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      draggedTaskId={draggedTaskId}
      handleDragStart={handleDragStart}
      handleDragEnd={handleDragEnd}
      updateTaskMutation={updateTaskMutation}
      onRequestDelete={(t) => setTaskToDelete(t)}
    />
  );

  return (
    <div className="app-container">
      <div className="waving-dots-container">
        <div className="waving-dot"></div>
        <div className="waving-dot"></div>
        <div className="waving-dot"></div>
        <div className="waving-dot"></div>
        <div className="waving-dot"></div>
        <div className="waving-dot"></div>
      </div>
      {/* Header Area */}
      <header className="app-header">
        <div className="header-logo-theme-wrapper">
          <h1 className="app-logo">
            EISENHOWER MATRIX PRO
          </h1>
          <div className="header-actions">
            <button
              type="button"
              onClick={() => setIsArchiveOpen(true)}
              className="archive-toggle-btn"
              title="Open Archive"
              aria-label="Open Archive"
            >
              <Archive className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              className="theme-toggle-btn"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>

        {/* Input form */}
        <form onSubmit={handleAddTask} className="input-container">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="What needs to be done? (Ctrl+K)"
              className="task-input"
            />
            <span className="shortcut-badge">Ctrl+K</span>
            <button type="submit" className="add-button">
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </form>
      </header>

      {/* Main Workspace */}
      <main className="matrix-workspace">
        {/* Pool Sidebar */}
        <section
          onDragOver={(e) => handleDragOver(e, 'pool')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'pool')}
          className={`pool-panel ${activeDragOverQuadrant === 'pool' ? 'drag-over' : ''}`}
        >
          <div className="pool-header">
            <h2 className="panel-title">
              <ListTodo className="w-5 h-5 text-purple-400" />
              <span>Task Pool</span>
            </h2>
            <span className="pool-count">{poolTasks.length}</span>
          </div>

          <div className="task-list-scrollable">
            {isLoading ? (
              <div className="empty-state">
                <span className="empty-state-text">Loading tasks...</span>
              </div>
            ) : poolTasks.length === 0 ? (
              <div className="empty-state">
                <Info className="empty-state-icon w-6 h-6" />
                <span className="empty-state-text">No tasks in the pool.</span>
                <span className="empty-state-text" style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                  Type a task above and press Enter.
                </span>
              </div>
            ) : (
              poolTasks.map(renderTask)
            )}
          </div>
        </section>

        {/* Matrix quadrants inside a Graph container */}
        <div className="matrix-graph-wrapper">
          <div className="graph-grid-mesh"></div>
          <div className="graph-axis-x"></div>
          <div className="graph-axis-y"></div>
          <div className="graph-axis-center"></div>
          
          <div className="graph-label graph-label-top">▲ HIGH IMPORTANCE</div>
          <div className="graph-label graph-label-bottom">▼ LOW IMPORTANCE</div>
          <div className="graph-label graph-label-left">◀ HIGH URGENCY</div>
          <div className="graph-label graph-label-right">LOW URGENCY ▶</div>

          <section className="matrix-grid">
            {quadrantsConfig.map((q) => {
              const quadrantTasks = getTasksByQuadrant(q.id);
              const isOver = activeDragOverQuadrant === q.id;

              return (
                <div
                  key={q.id}
                  onDragOver={(e) => handleDragOver(e, q.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, q.id)}
                  className={`matrix-quadrant ${isOver ? 'drag-over' : ''}`}
                  style={
                    {
                      '--q-color': q.colorVar,
                      '--q-color-rgb': q.colorRgbVar,
                    } as React.CSSProperties
                  }
                >
                  <div className="quadrant-header">
                    <div className="quadrant-info">
                      <h3 className="quadrant-title">
                        {q.icon}
                        {q.title}
                      </h3>
                      <span className="quadrant-subtitle">{q.subtitle}</span>
                    </div>
                    <span className="pool-count">{quadrantTasks.length}</span>
                  </div>

                  <div className="task-list-scrollable">
                    {quadrantTasks.length === 0 ? (
                      <div className="empty-state" style={{ minHeight: '120px' }}>
                        <ArrowRight className="empty-state-icon w-5 h-5" style={{ transform: 'rotate(45deg)' }} />
                        <span className="empty-state-text">Drop tasks here</span>
                      </div>
                    ) : (
                      quadrantTasks.map(renderTask)
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </main>

      {/* Confirmation Modal */}
      {taskToDelete && (
        <div className="modal-overlay" onClick={() => setTaskToDelete(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Task</h3>
            <p className="modal-message">
              Are you sure you want to delete <strong>"{taskToDelete.text}"</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-cancel"
                onClick={() => setTaskToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-confirm"
                onClick={() => {
                  deleteTaskMutation.mutate(taskToDelete.id);
                  setTaskToDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {isArchiveOpen && (
        <div className="modal-overlay" onClick={() => setIsArchiveOpen(false)}>
          <div className="archive-container" onClick={(e) => e.stopPropagation()}>
            <div className="archive-header">
              <div className="archive-header-left">
                <Archive className="w-5 h-5 text-purple-400" />
                <h3 className="archive-title">Archive</h3>
                <span className="archive-count">{completedTasks.length} Completed</span>
              </div>
              <div className="archive-header-right">
                {completedTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearArchive}
                    className="archive-clear-btn"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  className="archive-close-btn"
                  onClick={() => setIsArchiveOpen(false)}
                  aria-label="Close Archive"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            <div className="archive-body">
              {completedTasks.length === 0 ? (
                <div className="archive-empty">
                  <Archive className="archive-empty-icon" />
                  <p>No completed tasks archived yet.</p>
                  <span>Complete tasks on the board to see them here!</span>
                </div>
              ) : (
                <div className="archive-list">
                  {getGroupedCompletedTasks().map((group) => (
                    <div key={group.date} className="archive-group">
                      <div className="archive-group-date">{group.date}</div>
                      <div className="archive-group-items">
                        {group.tasks.map((task) => (
                          <div key={task.id} className="archive-item">
                            <span className="archive-item-text">{task.text}</span>
                            <div className="archive-item-actions">
                              <button
                                type="button"
                                onClick={() => updateTaskMutation.mutate({ id: task.id, completed: false })}
                                className="archive-item-btn restore"
                                title="Restore task to board"
                                aria-label="Restore task"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteTaskMutation.mutate(task.id)}
                                className="archive-item-btn delete"
                                title="Delete task permanently"
                                aria-label="Delete task permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MatrixAppContent />
    </QueryClientProvider>
  );
}
