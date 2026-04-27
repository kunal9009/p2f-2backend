import React from 'react';
import { useNavigate } from 'react-router-dom';
import TaskForm from '../components/TaskForm';

export default function AddTask() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Add Task</h2>
          <p className="text-muted">Create a new task. Only admins can create or edit tasks.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/tasks')}>← Back to All Tasks</button>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <TaskForm
          onClose={() => navigate('/tasks')}
          onSaved={() => navigate('/tasks')}
        />
      </div>
    </div>
  );
}
