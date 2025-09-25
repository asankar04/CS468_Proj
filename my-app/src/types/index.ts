export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface TaskList {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

export interface Task {
  id: number;
  list_id: number;
  title: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateTaskListRequest {
  name: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  due_date?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  due_date?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}
