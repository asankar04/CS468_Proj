import { Database } from '@/lib/database';
import { User, TaskList, Task } from '@/types';
import fs from 'fs';
import path from 'path';

describe('Database', () => {
  let db: Database;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);
    await db.initialize();
  });

  afterEach(async () => {
    await db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('User Operations', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password_hash: 'hashed_password_123'
      };

      const user = await db.createUser(userData.email, userData.password_hash);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.password_hash).toBe(userData.password_hash);
      expect(user.created_at).toBeDefined();
    });

    it('should find user by email', async () => {
      const userData = {
        email: 'test@example.com',
        password_hash: 'hashed_password_123'
      };

      await db.createUser(userData.email, userData.password_hash);
      const foundUser = await db.findUserByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser!.email).toBe(userData.email);
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await db.findUserByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });

    it('should not allow duplicate emails', async () => {
      const userData = {
        email: 'test@example.com',
        password_hash: 'hashed_password_123'
      };

      await db.createUser(userData.email, userData.password_hash);
      
      await expect(
        db.createUser(userData.email, 'another_hash')
      ).rejects.toThrow();
    });
  });

  describe('TaskList Operations', () => {
    let userId: number;

    beforeEach(async () => {
      const user = await db.createUser('test@example.com', 'hash123');
      userId = user.id;
    });

    it('should create a task list for a user', async () => {
      const listName = 'My Tasks';
      const taskList = await db.createTaskList(userId, listName);

      expect(taskList).toBeDefined();
      expect(taskList.id).toBeDefined();
      expect(taskList.user_id).toBe(userId);
      expect(taskList.name).toBe(listName);
      expect(taskList.created_at).toBeDefined();
    });

    it('should get all task lists for a user', async () => {
      await db.createTaskList(userId, 'List 1');
      await db.createTaskList(userId, 'List 2');

      const lists = await db.getTaskListsByUserId(userId);

      expect(lists).toHaveLength(2);
      expect(lists[0].name).toBe('List 1');
      expect(lists[1].name).toBe('List 2');
    });

    it('should delete a task list', async () => {
      const taskList = await db.createTaskList(userId, 'To Delete');
      
      await db.deleteTaskList(taskList.id, userId);
      
      const lists = await db.getTaskListsByUserId(userId);
      expect(lists).toHaveLength(0);
    });
  });

  describe('Task Operations', () => {
    let userId: number;
    let listId: number;

    beforeEach(async () => {
      const user = await db.createUser('test@example.com', 'hash123');
      userId = user.id;
      const taskList = await db.createTaskList(userId, 'Test List');
      listId = taskList.id;
    });

    it('should create a task in a list', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        due_date: '2024-12-31',
        status: 'pending' as const
      };

      const task = await db.createTask(listId, taskData);

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.list_id).toBe(listId);
      expect(task.title).toBe(taskData.title);
      expect(task.description).toBe(taskData.description);
      expect(task.due_date).toBe(taskData.due_date);
      expect(task.status).toBe(taskData.status);
    });

    it('should get all tasks for a list', async () => {
      await db.createTask(listId, { title: 'Task 1', status: 'pending' });
      await db.createTask(listId, { title: 'Task 2', status: 'completed' });

      const tasks = await db.getTasksByListId(listId);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    it('should update a task', async () => {
      const task = await db.createTask(listId, { title: 'Original', status: 'pending' });
      
      const updatedTask = await db.updateTask(task.id, {
        title: 'Updated Title',
        status: 'completed'
      });

      expect(updatedTask.title).toBe('Updated Title');
      expect(updatedTask.status).toBe('completed');
    });

    it('should delete a task', async () => {
      const task = await db.createTask(listId, { title: 'To Delete', status: 'pending' });
      
      await db.deleteTask(task.id);
      
      const tasks = await db.getTasksByListId(listId);
      expect(tasks).toHaveLength(0);
    });
  });
});
