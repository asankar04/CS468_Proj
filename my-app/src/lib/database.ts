import sqlite3 from 'sqlite3';
import { User, TaskList, Task, CreateTaskRequest, UpdateTaskRequest } from '../types';

export class Database {
  private db: sqlite3.Database;

  constructor(private dbPath: string = 'tasks.db') {
    this.db = new sqlite3.Database(dbPath);
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create users table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create task_lists table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS task_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          )
        `);

        // Create tasks table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            due_date TEXT,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (list_id) REFERENCES task_lists (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // User operations
  async createUser(email: string, passwordHash: string): Promise<User> {
    return new Promise((resolve, reject) => {      
      const stmt = this.db.prepare(`
        INSERT INTO users (email, password_hash) VALUES (?, ?)
      `);
      
      const db = this.db; 

      stmt.run([email, passwordHash], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        const lastID = this.lastID;
        // Get the created user
        db.get('SELECT * FROM users WHERE id = ?', [lastID], (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve(row as User);
        });
      });
      
      stmt.finalize();
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row: any) => {
          if (err) reject(err);
          else resolve(row ? (row as User) : null);
        }
      );
    });
  }

  // TaskList operations
  async createTaskList(userId: number, name: string): Promise<TaskList> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO task_lists (user_id, name) VALUES (?, ?)
      `);
      
      const db = this.db; 

      stmt.run([userId, name], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        const lastID = this.lastID;
        // Get the created task list
        db.get('SELECT * FROM task_lists WHERE id = ?', [lastID], (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve(row as TaskList);
        });
      });
      
      stmt.finalize();
    });
  }

  async getTaskListsByUserId(userId: number): Promise<TaskList[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM task_lists WHERE user_id = ? ORDER BY created_at ASC',
        [userId],
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows as TaskList[]);
        }
      );
    });
  }

  async deleteTaskList(listId: number, userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM task_lists WHERE id = ? AND user_id = ?',
        [listId, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Task operations
  async createTask(listId: number, taskData: CreateTaskRequest): Promise<Task> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO tasks (list_id, title, description, due_date, status) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const db = this.db; 

      stmt.run([
        listId,
        taskData.title,
        taskData.description || null,
        taskData.due_date || null,
        taskData.status || 'pending'
      ], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        const lastID = this.lastID;
        // Get the created task
        db.get('SELECT * FROM tasks WHERE id = ?', [lastID], (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve(row as Task);
        });
      });
      
      stmt.finalize();
    });
  }

  async getTasksByListId(listId: number): Promise<Task[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM tasks WHERE list_id = ? ORDER BY created_at ASC',
        [listId],
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows as Task[]);
        }
      );
    });
  }

  async updateTask(taskId: number, updates: UpdateTaskRequest): Promise<Task> {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.due_date !== undefined) {
        fields.push('due_date = ?');
        values.push(updates.due_date);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(taskId);
      
      const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
      
      this.db.run(sql, values, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Get the updated task
        this.db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, row: any) => {
          if (err) reject(err);
          else resolve(row as Task);
        });
      });
    });
  }

  async deleteTask(taskId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM tasks WHERE id = ?', [taskId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
