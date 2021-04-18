import * as fs from 'fs';
import * as rimraf from 'rimraf';

/**
 * If for relative path use path.resolve(__dirname, "<path>")
 * @param path
 */
const checkExist = (path: string): Promise<boolean> => {
  return fs.promises
    .access(path, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
};

/**
 * If for relative path use path.resolve(__dirname, "<path>")
 */
const checkExistSync = (
  path: string,
  callback: checkExistSynCallback,
): void => {
  fs.access(path, (error) => {
    if (error) {
      return callback(false);
    }
    return callback(true);
  });
};

type checkExistSynCallback = (value: boolean) => void;

/**
 * If for relative path use path.resolve(__dirname, "<path>")
 */
const readFile = (filePath: string): Promise<string> => {
  return new Promise((resolve) => {
    fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
      if (err) {
        return resolve('');
      }
      resolve(data);
    });
  });
};

/**
 * If for relative path use path.resolve(__dirname, "<path>")
 */
const saveFile = (filePath: string, data: string): Promise<boolean> => {
  return new Promise((resolve) => {
    fs.writeFile(filePath, data, { encoding: 'utf8' }, (err) => {
      if (err) {
        return resolve(false);
      }
      return resolve(true);
    });
  });
};

const deleteFile = (filePath: string): Promise<boolean> => {
  return new Promise((resolve) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        return resolve(false);
      }
      return resolve(true);
    });
  });
};

const deleteFolder = (folderPath: string): Promise<boolean> => {
  return new Promise((resolve) => {
    rimraf(folderPath, (err) => {
      if (err) {
        return resolve(false);
      }
      return resolve(true);
    });
  });
};

export {
  checkExist,
  checkExistSync,
  readFile,
  saveFile,
  deleteFile,
  deleteFolder,
};
