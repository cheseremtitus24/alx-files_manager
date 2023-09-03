import sha1 from 'sha1';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import userUtils from '../utils/user';

const userQueue = new Queue('userQueue');

class UsersController {
  static async postNew(req, res) {
    // new user must have an email and a password
    const { email, password } = req.body;

    if (!email) {
      // return an error Missing email with a status code 400
      return res.status(400)
        .send({ error: 'Missing email' });
    }

    if (!password) {
      // return an error Missing password with a status code 400
      return res.status(400)
        .send({ error: 'Missing password' });
    }
    const collection = await dbClient.usersCollection();
    const dbEmail = await collection.findOne({ email });

    if (dbEmail) {
      return res.status(400)
        .send({ error: 'Already exist' });
    }

    // password must be stored after being hashed in SHA1
    const hashPass = sha1(password);

    let dbResult;
    try {
      dbResult = await collection.insertOne({
        email,
        password: hashPass,
      });
    } catch (err) {
      await userQueue.add({});
      return res.status(500)
        .send({ error: 'Error creating user.' });
    }

    const user = {
      id: dbResult.insertedId,
      email,
    };

    await userQueue.add({
      userId: dbResult.insertedId.toString(),
    });

    return res.status(201)
      .send(user);
  }

  // Retrieve the user based on the token
  static async getMe(req, res) {
    const { userId } = await userUtils.getUserIdAndKeys(req);
    const user = await userUtils.getUser({ _id: ObjectId(userId) });

    // if user not found, return an error Unauthorized with a status code 401
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    // return the user object (email and id only)
    const foundUser = { id: user._id, email: user.email };
    // delete foundUser._id;
    // delete foundUser.password;

    return res.status(200).send(foundUser);
  }
}
export default UsersController;
