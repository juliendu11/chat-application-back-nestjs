import * as md5 from 'md5';

const generateRandomToken = (): string => {
  const dateNow = new Date().toISOString();
  return md5(dateNow);
};

export { generateRandomToken };
