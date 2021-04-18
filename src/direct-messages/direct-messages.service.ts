import { Injectable } from '@nestjs/common';
import { CreateDirectMessageInput } from './dto/create-direct-message.input';
import { UpdateDirectMessageInput } from './dto/update-direct-message.input';

@Injectable()
export class DirectMessagesService {
  create(createDirectMessageInput: CreateDirectMessageInput) {
    return 'This action adds a new directMessage';
  }

  findAll() {
    return `This action returns all directMessages`;
  }

  findOne(id: number) {
    return `This action returns a #${id} directMessage`;
  }

  update(id: number, updateDirectMessageInput: UpdateDirectMessageInput) {
    return `This action updates a #${id} directMessage`;
  }

  remove(id: number) {
    return `This action removes a #${id} directMessage`;
  }
}
