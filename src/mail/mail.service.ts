import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from 'nestjs-config';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';
import { resolve } from 'path';

import { checkExist, readFile } from '../helpers/file.helper';
import { replaceAll } from '../helpers/text.helper';

@Injectable()
export class MailService {
  private from = '';
  private siteUrl = '';

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private logger: NestjsWinstonLoggerService,
  ) {
    this.configService = configService;
    this.from = this.configService.get('mail.from');
    this.siteUrl = this.configService.get('app.siteUrl');
    logger.setContext(MailService.name);
  }

  async sendForgotPasswordMail(to: string, token: string) {
    this.logger.log(
      `>>>> [sendForgotPasswordMail] Use with ${JSON.stringify({ to, token })}`,
    );

    const { text, html } = await this.getText(
      'Forgot password',
      `You have requested a change of password.\n\nClick on this link to change your password:${this.siteUrl}reset-password?email=${to}&token=${token}`,
    );
    await this.sendMail(to, 'Forgot password', text, html);
  }

  async sendConfirmAccountMail(to: string, token: string) {
    this.logger.log(
      `>>>> [sendConfirmAccountMail] Use with ${JSON.stringify({ to, token })}`,
    );

    const { text, html } = await this.getText(
      'Confirm your account',
      `To confirm your account click on this link:${this.siteUrl}confirm?email=${to}&token=${token}`,
    );
    await this.sendMail(to, 'Confirm your account', text, html);
  }

  async sendAccountConfirmedMail(to: string) {
    this.logger.log(
      `>>>> [sendAccountConfirmedMail] Use with ${JSON.stringify({ to })}`,
    );

    const { text, html } = await this.getText(
      'Account confirmed',
      `Congratulations your account is now confirmed, you can log in`,
    );
    await this.sendMail(to, 'Account confirmed', text, html);
  }

  private async sendMail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ) {
    await this.mailerService.sendMail({
      to,
      subject,
      text,
      html,
      from: this.from,
    });
  }

  private async getText(subject: string, text: string) {
    const values = {
      html: '',
      text: '',
    };

    const htmlVersionPath = resolve(
      __dirname,
      'templates',
      'html.version.html',
    );
    const textVersionPath = resolve(__dirname, 'templates', 'text.version.txt');

    const htmlVersionExist = await checkExist(htmlVersionPath);
    const textVersionExist = await checkExist(textVersionPath);

    if (htmlVersionExist) {
      values.html = await readFile(htmlVersionPath);
      if (values.html) {
        values.html = replaceAll(values.html, '{{SUBJECT}}', subject);
        values.html = replaceAll(
          values.html,
          '{{TEXT P}}',
          replaceAll(text, '\n', '<br>'),
        );
      }
    }

    if (textVersionExist) {
      values.text = await readFile(textVersionPath);
      if (values.text) {
        values.text = replaceAll(values.text, '{{SUBJECT}}', subject);
        values.text = replaceAll(values.text, '{{TEXT P}}', text);
      }
    }

    return values;
  }
}
