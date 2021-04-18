export default {
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 0,
  user: process.env.MAIL_USER,
  password: process.env.MAIL_PASS,
  from: process.env.MAIL_FROM,
};
