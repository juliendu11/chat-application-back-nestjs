export default {
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  dbName: process.env.DATABASE_NAME,
  username: process.env.DATABASE_AUTH_USERNAME,
  password: process.env.DATABASE_AUTH_PASSWORD,
  isAdminAuth: process.env.DATABASE_AUTH_ADMIN === 'true',
};
