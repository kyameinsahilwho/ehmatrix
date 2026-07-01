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
  Moon
} from 'lucide-react';
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

function MatrixAppContent() {
  const [taskText, setTaskText] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDragOverQuadrant, setActiveDragOverQuadrant] = useState<string | null>(null);
  
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

  // Group tasks by quadrant
  const getTasksByQuadrant = (quadrant: QuadrantType) => {
    return tasks.filter((t) => t.quadrant === quadrant);
  };

  const poolTasks = getTasksByQuadrant('pool');

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
    <div
      key={task.id}
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      onDragEnd={handleDragEnd}
      className={`task-item ${draggedTaskId === task.id ? 'dragging' : ''}`}
    >
      <div className="task-content-left">
        <button
          type="button"
          onClick={() =>
            updateTaskMutation.mutate({ id: task.id, completed: !task.completed })
          }
          className={`task-checkbox-btn ${task.completed ? 'completed' : ''}`}
          aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
        >
          {task.completed && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
        </button>
        <span className={`task-text ${task.completed ? 'completed' : ''}`}>
          {task.text}
        </span>
      </div>
      <button
        type="button"
        onClick={() => deleteTaskMutation.mutate(task.id)}
        className="delete-btn"
        aria-label="Delete task"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="app-container">
      {/* Header Area */}
      <header className="app-header">
        <div className="header-logo-theme-wrapper">
          <h1 className="app-logo">
            EISENHOWER MATRIX
          </h1>
          <button
            type="button"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            className="theme-toggle-btn"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </button>
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
