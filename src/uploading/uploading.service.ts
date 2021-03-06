import { Injectable } from '@nestjs/common';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';
import * as path from 'path';
import { createWriteStream, ReadStream } from 'fs';
import { mkdir } from 'fs/promises';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import { FileUpload } from 'graphql-upload';
import { generateRandomToken } from '../helpers/random.helper';
import { MessageMedia } from '../rooms/entities/sub/message.entity';

@Injectable()
export class UploadingService {
  private uploadPath = path.resolve(__dirname, '..', '..', 'uploads');

  private uploadProfilPicPath = path.resolve(this.uploadPath, 'pictures');

  private uploadConversationMediaPath = path.resolve(
    this.uploadPath,
    'conversations',
  );

  private uploadRoomMediaPath = path.resolve(this.uploadPath, 'rooms');

  constructor(private logger: NestjsWinstonLoggerService) {
    logger.setContext(UploadingService.name);
  }

  async uploadRoomMedia(
    roomId: string,
    filesSelected: Promise<FileUpload>,
  ): Promise<ServiceResponseType<MessageMedia | null>> {
    try {
      this.logger.log(
        `>>>> [uploadRoomMedia] Use with ${JSON.stringify({
          roomId,
        })}`,
      );

      if (!filesSelected) {
        return { code: 400, message: 'No file to upload', value: null };
      }

      const folder = path.resolve(this.uploadRoomMediaPath, roomId);
      const response = await this.uploading(
        folder,
        roomId,
        'rooms',
        filesSelected,
      );

      this.logger.log(
        `<<<< [uploadConversationMedia] Response: ${JSON.stringify({
          response,
        })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [uploadRoomMedia] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async uploadConversationMedia(
    conversationId: string,
    filesSelected: Promise<FileUpload>,
  ): Promise<ServiceResponseType<MessageMedia | null>> {
    try {
      this.logger.log(
        `>>>> [uploadConversationMedia] Use with ${JSON.stringify({
          conversationId,
        })}`,
      );

      if (!filesSelected) {
        return { code: 400, message: 'No file to upload', value: null };
      }

      const folder = path.resolve(
        this.uploadConversationMediaPath,
        conversationId,
      );
      const response = await this.uploading(
        folder,
        conversationId,
        'conversations',
        filesSelected,
      );

      this.logger.log(
        `<<<< [uploadConversationMedia] Response: ${JSON.stringify({
          response,
        })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [uploadConversationMedia] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  private async uploading(
    folder: string,
    id: string,
    type: string,
    filesSelected: Promise<FileUpload>,
  ) {
    const { createReadStream, mimetype } = await filesSelected;
    const stream = createReadStream();

    const filename = `${generateRandomToken()}.${mimetype.split('/')[1]}`;

    const link = path.resolve(folder, filename);

    await mkdir(folder, { recursive: true });

    const writeFile = await this.writeFile(stream, link);

    const response = {
      code: writeFile.code,
      message: writeFile.message,
      value: {
        path: `uploads/${type}/${id}/${filename}`,
        type: mimetype,
      },
    };
    return response;
  }

  async uploadProfilPic(
    id: string,
    filesSelected: Promise<FileUpload>,
    memberUsername: string,
  ): Promise<ServiceResponseType<undefined>> {
    try {
      this.logger.log(
        `>>>> [updateProfilPic] Use with ${JSON.stringify({
          id,
          memberUsername,
        })}`,
      );

      if (!filesSelected) {
        return { code: 400, message: 'No file to upload', value: null };
      }

      const link = path.resolve(
        this.uploadProfilPicPath,
        `${memberUsername}.jpg`,
      );

      await mkdir(this.uploadProfilPicPath, { recursive: true });

      const { createReadStream } = await filesSelected;
      const stream = createReadStream();

      const response = await this.writeFile(stream, link);

      this.logger.log(
        `<<<< [updateProfilPic] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [updateProfilPic] Exception`, error);

      return {
        code: 500,
        message: error.message,
      };
    }
  }

  private async writeFile(
    stream: ReadStream,
    link: string,
  ): Promise<ServiceResponseType<undefined>> {
    return new Promise((resolve, reject) => {
      const write = createWriteStream(link);
      stream
        .pipe(write)
        .on('error', (error) => {
          resolve({ code: 500, message: error.message });
        })
        .on('finish', () => {
          resolve({ code: 200, message: link });
        });
    });
  }
}
