import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from './entities/miniapp.entity';

@Injectable()
export class MiniappService {
  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,
  ) {}

  create(data: Partial<MiniApp>) {
    const app = this.miniappRepository.create(data);
    return this.miniappRepository.save(app);
  }

  findAll(query: any = {}) {
    return this.miniappRepository.find({ where: query });
  }

  findOne(id: string) {
    return this.miniappRepository.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<MiniApp>) {
    await this.miniappRepository.update(id, data);
    return this.findOne(id);
  }

  remove(id: string) {
    return this.miniappRepository.delete(id);
  }
}
