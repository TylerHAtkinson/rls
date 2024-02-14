import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RLSConnection } from 'lib/common';
import { TENANT_CONNECTION } from 'lib/rls.constants';
import { Category } from 'test/util/entity/Category';
import { Repository } from 'typeorm';
import { PostRepository } from './post.repository';

export class AppService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @Inject(PostRepository)
    private postRepo: PostRepository,
    @Inject(TENANT_CONNECTION)
    private connection: RLSConnection,
  ) {}

  async status(): Promise<any> {
    return 'ok';
  }

  async getCategories() {
    // help to test the connection
    await this.stop();
    await this.getConnection();

    return this.categoryRepo.find();
  }

  async getPosts(useStream?: boolean) {
    if (useStream) {
      const result = [];
      const stream = await this.postRepo.createQueryBuilder('posts').stream();
      await new Promise<void>((resolve, reject) => {
        stream.on('data', data => {
          result.push(data);
        });
        stream.on('error', err => {
          reject(err);
        });
        stream.on('end', () => resolve());
      });
      return result;
    }
    return this.postRepo.read();
  }

  async getConnection() {
    return this.connection;
  }

  async stop() {
    return;
  }

  async simulateEntityRemoveRollback() {
    const qr = this.connection.createQueryRunner();
    await qr.startTransaction();
    const manager = qr.manager;
    const [category] = await manager.find(Category, {});
    const responseObject = { categoryId: category.id };
    await manager.remove(category);
    await qr.rollbackTransaction();
    await qr.release();

    return responseObject;
  }
}
