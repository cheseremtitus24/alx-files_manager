import * as express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

function Routing(app) {
  const router = express.Router();
  app.use('/', router);

  router.get('/status', (req, res) => {
    AppController.getStatus(req, res);
  });

  router.get('/stats', (req, res) => {
    AppController.getStats(req, res);
  });

  router.post('/users', (req, res) => {
    UsersController.postNew(req, res);
  });

  // Authentication Endpoints
  // should sign-in the user by
  // generating a new authentication token:
  router.get('/connect', (req, res) => {
    AuthController.getConnect(req, res);
  });

  router.get('/disconnect', (req, res) => {
    AuthController.getDisconnect(req, res);
  });

  router.get('/users/me', (req, res) => {
    UsersController.getMe(req, res);
  });
  router.post('/files', (req, res) => {
    FilesController.postUpload(req, res);
  });
  // get stored files
  // should retrieve the file document based on the ID
  router.get('/files/:id', (req, res) => {
    FilesController.getShow(req, res);
  });
  // should retrieve all users
  // file documents for a specific parentId
  // and with pagination:
  router.get('/files', (req, res) => {
    FilesController.getIndex(req, res);
  });

  router.put('/files/:id/publish', (req, res) => {
    FilesController.putPublish(req, res);
  });

  router.put('/files/:id/unpublish', (req, res) => {
    FilesController.putUnpublish(req, res);
  });

  router.get('/files/:id/data', (req, res) => {
    FilesController.getFile(req, res);
  });
}
export default Routing;
