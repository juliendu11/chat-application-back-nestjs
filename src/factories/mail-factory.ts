import { Injectable } from '@nestjs/common';
import { ConfigService } from 'nestjs-config';
import { MailerOptions, MailerOptionsFactory } from '@nestjs-modules/mailer';

@Injectable()
export class MailerFactory implements MailerOptionsFactory {
  constructor(private readonly config: ConfigService) {
    this.config = config;
  }

  createMailerOptions(): MailerOptions | Promise<MailerOptions> {
    return {
      transport: {
        host: this.config.get('mail.host'),
        port: this.config.get('mail.port'),
        secure: false, // upgrade later with STARTTLS
        auth: {
          user: this.config.get('mail.user'),
          pass: this.config.get('mail.password'),
        },
        defaults: {
          from: this.config.get('mail.from'),
        },
      },
    };
  }
}
