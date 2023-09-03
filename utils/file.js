import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromises } from 'fs';
import dbClient from './db';
import userUtils from './user';

const fileUtils = {
  async validateBody(req) {
    const {
      name, type, isPublic = false, data,
    } = req.body;
    let { parentId = 0 } = req.body;
    const typesAllowed = ['file', 'image', 'folder'];
    let message = null;

    if (parentId === '0') {
      parentId = 0;
    }

    function isValidId(parentId) {
      try {
        ObjectId(parentId);
      } catch (err) {
        return false;
      }
      return true;
    }

    if (!name) {
      message = 'Missing name';
    } else if (!type || !typesAllowed.includes(type)) {
      message = 'Missing type';
    } else if (!data && type !== 'folder') {
      message = 'Missing data';
    } else if (parentId && parentId !== '0') {
      let file;

      if (isValidId(parentId)) {
        file = await this.getFile({ _id: ObjectId(parentId) });
      } else {
        file = null;
      }

      if (!file) {
        message = 'Parent not found';
      } else if (file.type !== 'folder') {
        message = 'Parent is not a folder';
      }
    }

    const result = {
      error: message,
      fileParams: {
        name,
        type,
        parentId,
        isPublic,
        data,
      },
    };
    return result;
  },
  async saveFile(userId, fileParams, folderPath) {
    const {
      name, type, isPublic, data,
    } = fileParams;
    let { parentId } = fileParams;

    if (parentId !== 0) {
      parentId = ObjectId(parentId);
    }

    const query = {
      userId: ObjectId(userId), name, type, isPublic, parentId,
    };

    if (fileParams.type !== 'folder') {
      // Create a local path in the storing
      // folder with filename a UUID
      const fileUUID = uuidv4();
      // data contains the Base64 of the file
      const dataDecoded = Buffer.from(data, 'base64');
      const path = `${folderPath}/${fileUUID}`;

      query.localPath = path;

      try {
        await fsPromises.mkdir(folderPath, { recursive: true });
        await fsPromises.writeFile(path, dataDecoded);
      } catch (err) {
        return { error: err.message, code: 400 };
      }
    }

    const collection = await dbClient.filesCollection();
    const result = await collection.insertOne(query);
    const file = this.processFile(query);
    const newFile = { id: result.insertedId, ...file };

    return { error: null, newFile };
  },
  processFile(query) {
    const file = { id: query._id, ...query };

    delete file.localPath;
    delete file._id;
    return file;
  },
  async getFile(query) {
    const collection = await dbClient.filesCollection();
    const file = await collection.findOne(query);
    return file;
  },
  async getFilesOfParentId(query) {
    const collection = await dbClient.filesCollection();
    return collection.aggregate(query);
  },
  async publishUn(req, check) {
    const { id: fileId } = req.params;

    function isValidId(fileId) {
      try {
        ObjectId(fileId);
      } catch (err) {
        return false;
      }
      return true;
    }

    if (!isValidId(fileId)) {
      return { error: 'Unauthorized', code: 401 };
    }

    const { userId } = await userUtils.getUserIdAndKeys(req);

    if (!isValidId(userId)) {
      return { error: 'Unauthorized', code: 401 };
    }

    const user = await userUtils.getUser({ _id: ObjectId(userId) });

    if (!user) {
      return { error: 'Unauthorized', code: 401 };
    }

    const file = await this.getFile({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    if (!file) {
      return { error: 'Not found', code: 404 };
    }

    const result = await this.updateFile(
      {
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      },
      { $set: { isPublic: check } },
    );

    const {
      _id: id, userId: resultUserId, name, type, isPublic, parentId,
    } = result.value;
    const updatedFile = {
      id, userId: resultUserId, name, type, isPublic, parentId,
    };

    return { error: null, code: 200, updatedFile };
  },
  isOwnerAndPublic(file, userId) {
    if (
      (!file.isPublic && !userId)
      || (userId && file.userId.toString() !== userId && !file.isPublic)) {
      return false;
    }
    return true;
  },
  async getFileData(file, size) {
    let { localPath } = file;
    let data;

    if (size) {
      localPath = `${localPath}_${size}`;
    }

    try {
      data = await fsPromises.readFile(localPath);
    } catch (err) {
      return { error: 'Not found', code: 404 };
    }
    return { data };
  },
};
export default fileUtils;
