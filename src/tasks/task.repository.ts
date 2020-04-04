import { Task } from './task.entity';
import { EntityRepository, Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from './task-status.enum';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { User } from '../auth/user.entity';
import { InternalServerErrorException } from '@nestjs/common';
import { createLogger, format, transports } from 'winston';

@EntityRepository(Task)
export class TaskRepository extends Repository<Task> {
  private logger = createLogger({
    level: 'info',
    format: format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
      //
      // - Write all logs with level `error` and below to `error.log`
      // - Write all logs with level `info` and below to `combined.log`
      //
      new transports.File({ filename: 'error.log', level: 'error' }),
      new transports.File({ filename: 'combined.log' })
    ]
  });

  async getTasks(
    filterDto: GetTasksFilterDto,
    user: User,
  ): Promise<Task[]> {
    const { status, search } = filterDto;
    const query = this.createQueryBuilder('task');

    query.where('task.userId = :userId', { userId: user.id });

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (search) {
      query.andWhere('(task.title LIKE :search OR task.description LIKE :search)', { search: `%${search}%` });
    }

    try {
      const tasks = await query.getMany();
      return tasks;
    } catch (error) {
      this.logger.error(`Failed to get tasks for user "${user.username}". Filters: ${JSON.stringify(filterDto)}`, { "date": new Date(), "status": 500 });
      throw new InternalServerErrorException();
    }
  }

  async createTask(
    createTaskDto: CreateTaskDto,
    user: User,
  ): Promise<Task> {
    const { title, description } = createTaskDto;

    const task = new Task();
    task.title = title;
    task.description = description;
    task.status = TaskStatus.OPEN;
    task.user = user;

    try {
      await task.save();
      this.logger.info(`Succesfully created a task for user "${user.username}". Data: ${createTaskDto}`, { "date": new Date(), "status": 201 });
    } catch (error) {
      this.logger.error(`Failed to create a task for user "${user.username}". Data: ${createTaskDto}`, { "date": new Date(), "status": 500 });
      throw new InternalServerErrorException();
    }

    delete task.user;
    return task;
  }
}
