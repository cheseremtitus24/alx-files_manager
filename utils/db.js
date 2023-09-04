const { MongoClient } = require('mongodb');

class DBClient {
  /**
   * C:\Users\user\alx-files_manager>curl -S http://127.0.0.1:5000/stats
   {"users":0,"files":0}
   C:\Users\user\alx-files_manager>curl -S http://127.0.0.1:5000/status
   {"redis":true,"db":true}
   */
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}/${database}`;

    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect();
  }

  isAlive() {
    // returns true when the connection to MongoDB is a success
    return this.client.topology.isConnected();
  }

  async nbUsers() {
    // returns the number of documents in the collection users
    return this.client.db()
      .collection('users')
      .countDocuments();
  }

  async nbFiles() {
    // returns the number of documents in the collection files
    return this.client.db()
      .collection('files')
      .countDocuments();
  }

  async usersCollection() {
    return this.client.db().collection('users');
  }

  async filesCollection() {
    return this.client.db().collection('files');
  }
}
const dbClient = new DBClient();
export default dbClient;
