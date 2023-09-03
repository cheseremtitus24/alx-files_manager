import { ObjectId } from 'mongodb';
import Queue from 'bull';
import mime from 'mime-types';
import userUtils from '../utils/user';
import fileUtils from '../utils/file';

const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Queue('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    // Retrieves the user based on the token
    const { userId } = await userUtils.getUserIdAndKeys(req);
    // If not found, return an error Unauthorized with a status code 401
    if (!FilesController.isValidId(userId)) {
      return res.status(401)
        .send({ error: 'Unauthorized' });
    }

    if (!userId && req.body.type === 'image') {
      await fileQueue.add({});
    }

    const user = await userUtils.getUser({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401)
        .send({ error: 'Unauthorized' });
    }

    const { error: validationError, fileParams } = await fileUtils.validateBody(req);

    if (validationError) {
      return res.status(400)
        .send({ error: validationError });
    }

    if (fileParams.parentId !== 0 && !FilesController.isValidId(fileParams.parentId)) {
      return res.status(400)
        .send({ error: 'Parent not found' });
    }
    // The user ID should be
    // added to the document saved in
    // DB - as owner of a file
    const { error, code, newFile } = await fileUtils.saveFile(
      userId,
      fileParams,
      folderPath,
    );

    if (error) {
      if (res.body.type === 'image') {
        await fileQueue.add({ userId });
      }
      return res.status(code)
        .send(error);
    }

    if (fileParams.type === 'image') {
      await fileQueue.add({
        fileId: newFile.id.toString(),
        userId: newFile.userId.toString(),
      });
    }
    return res.status(201)
      .send(newFile);
  }

  static isValidId(userId) {
    try {
      ObjectId(userId);
    } catch (err) {
      return false;
    }
    return true;
  }

  static async getShow(req, res) {
    const fileId = req.params.id;
    const { userId } = await userUtils.getUserIdAndKeys(req);
    const user = await userUtils.getUser({ _id: ObjectId(userId) });
    // If not found, return an error Unauthorized with a status code 401
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    // If no file document is linked to the user and
    // the ID passed as parameter
    // return an error Not found with a status code 404
    if (!FilesController.isValidId(fileId) || !FilesController.isValidId(userId)) {
      return res.status(404).send({ error: 'Not found' });
    }
    const result = await fileUtils.getFile({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });
    if (!result) {
      return res.status(404).send({ error: 'Not found' });
    }

    const file = fileUtils.processFile(result);
    return res.status(200).send(file);
  }

  // should retrieve all users
  // file documents for a specific parentId
  // and with pagination:
  static async getIndex(req, res) {
    const { userId } = await userUtils.getUserIdAndKeys(req);
    // Retrieve the user based on the token:
    const user = await userUtils.getUser({ _id: ObjectId(userId) });
    // If not found, return an error
    // Unauthorized with a status code 401
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    let parentId = req.query.parentId || '0';

    if (parentId === '0') {
      parentId = 0;
    }

    let page = Number(req.query.page) || 0;

    if (Number.isNaN(page)) {
      page = 0;
    }

    if (parentId !== 0 && parentId !== '0') {
      if (!FilesController.isValidId(parentId)) {
        return res.status(401).send({ error: 'Unauthorized' });
      }
      parentId = ObjectId(parentId);

      const folder = await fileUtils.getFile({ _id: ObjectId(parentId) });

      if (!folder || folder.type !== 'folder') {
        return res.status(200).send([]);
      }
    }
    // Pagination
    const pipeline = [
      { $skip: page * 20 },
      { $limit: 20 },
      { $sort: { _id: -1 } },
    ];

    if (parentId === 0) {
      pipeline.push({ $match: {} });
    } else { pipeline.push({ $match: { parentId } }); }
    const fileCursor = await fileUtils.getFilesOfParentId(pipeline);
    const files = [];

    await fileCursor.forEach((doc) => {
      const document = fileUtils.processFile(doc);
      files.push(document);
    });

    return res.status(200).send(files);
  }

  static async putPublish(req, res) {
    const { error, code, updatedFile } = await fileUtils.publishUn(req, true);

    if (error) {
      return res.status(code).send({ error });
    }
    return res.status(code).send(updatedFile);
  }

  static async putUnpublish(req, res) {
    const { error, code, updatedFile } = await fileUtils.publishUn(req, false);

    if (error) {
      return res.status(code).send({ error });
    }
    return res.status(code).send(updatedFile);
  }

  static async getFile(req, res) {
    const { userId } = await userUtils.getUserIdAndKeys(req);
    const { id: fileId } = req.params;
    const size = req.query.size || 0;

    if (!FilesController.isValidId(fileId)) {
      return res.status(404).send({ error: 'Not found' });
    }

    const file = await fileUtils.getFile({ _id: ObjectId(fileId) });

    if (!file || !fileUtils.isOwnerAndPublic(file, userId)) {
      return res.status(404).send({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).send({ error: "A folder doesn't have content" });
    }

    const { error, code, data } = await fileUtils.getFileData(file, size);

    if (error) {
      return res.status(code).send({ error });
    }

    const mimeType = mime.contentType(file.name);
    res.setHeader('Content-Type', mimeType);

    return res.status(200).send(data);
  }
}
export default FilesController;
