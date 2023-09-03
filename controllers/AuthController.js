import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import userUtils from '../utils/user';

class AuthController {
  /**
   * curl 0.0.0.0:5000/connect -H "Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=" ; echo ""
   * curl 0.0.0.0:5000/users/me -H "X-Token: 031bffac-3edc-4e51-aaae-1c121317da8a" ; echo ""
   {"id":"5f1e7cda04a394508232559d","email":"bob@dylan.com"}
   *
   * curl 0.0.0.0:5000/disconnect -H "X-Token: 031bffac-3edc-4e51-aaae-1c121317da8a" ; echo ""
   *
   * curl 0.0.0.0:5000/users/me -H "X-Token: 031bffac-3edc-4e51-aaae-1c121317da8a" ; echo ""
   {"error":"Unauthorized"}
   * @param req
   * @param res
   * @returns {Promise<*>}
   */
  static async getConnect(req, res) {
    // using the header Authorization and the technique of the
    // Basic auth (Base64 of the <email>:<password>), find the
    // user associate to this email and with this password
    // (reminder: we are storing the SHA1 of the password)
    const Authorization = req.header('Authorization') || '';
    const credentials = Authorization.split(' ')[1];
    const decodedCredentials = Buffer.from(credentials, 'base64')
      .toString('utf-8');
    const [email, password] = decodedCredentials.split(':');

    if (!email || !password) {
      return res.status(401)
        .send({ error: 'Unauthorized' });
    }

    const hashPass = sha1(password);
    const user = await userUtils.getUser({
      email,
      password: hashPass,
    });

    // If no user has been found,
    // return an error Unauthorized with
    // a status code 401
    if (!user) {
      return res.status(401)
        .send({ error: 'Unauthorized' });
    }

    // Store a session token in redis
    // Expires in 24 hours
    // generate a random string
    const token = uuidv4();
    const key = `auth_${token}`;
    const exp = 24 * 3600;

    await redisClient.set(key, user._id.toString(), exp);

    // { "token": "155342df-2399-41da-9e8c-458b6ac52a0c" }
    return res.status(200)
      .send({ token });
  }

  static async getDisconnect(req, res) {
    // Every authenticated endpoints of our API
    // will look at this token
    // inside the header X-Token.
    const { userId, key } = await userUtils.getUserIdAndKeys(req);
    // if not found,
    // return an error Unauthorized with
    // a status code 401
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    // Otherwise, delete the token
    // in Redis and return nothing with
    // a status code 204
    await redisClient.del(key);

    return res.status(204).send();
  }
}
export default AuthController;
