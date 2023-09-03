import { createClient } from 'redis';
import { promisify } from 'util';

const fs = require('fs');
const os = require('os');
const path = require('path');

class RedisClient {
  constructor() {
    this.client = 'localhost';
  }

  // Getter
  get client() {
    return this._client;
  }

  // eslint-disable-next-line class-methods-use-this
  logtoFile(value) {
    // Get the path to the tmp directory.
    const tmpDir = os.tmpdir();

    // Create a file in the tmp directory.
    const fileName = 'redisStatusfile';
    const file = fs.openSync(path.join(tmpDir, fileName), 'w');
    // Write some data to the file.
    fs.writeFileSync(file, value);
    // Close the file.
    fs.closeSync(file);
  }

  isAlive() {
    // process.on('uncaughtException', (err) => {
    //   console.log(`Caught exception: ${err}`);
    // });
    const client = this._client;

    client.on('error', () => {
      // console.log('logged in connect ', client.connected);
      this.logtoFile('disconnected');
      // throw new Error('Redis client not connected to the server: ');
    });
    client.on('connect', () => {
      this.logtoFile('connected');
    });

    // Get the path to the tmp directory.
    const tmpDir = os.tmpdir();

    // Create a file in the tmp directory.
    const fileName = 'redisStatusfile';

    // Read the contents of the file to a variable.
    const fileData = fs.readFileSync(path.join(tmpDir, fileName));
    // Unbuffer the file data.
    const unbufferedFileData = fileData.toString();
    // console.log(fileData);
    // console.log(unbufferedFileData);

    // Compare the contents of the file to a string.
    if (unbufferedFileData === 'connected') {
      // console.log('The file contents match.');
      return true;
    } if (unbufferedFileData === 'disconnected') {
      // console.log('The file contents do not match.');
      return false;
    }

    return undefined;
  }

  // get students() {
  //   return this._students;
  // }

  // Setter
  set client(redisServer) {
    this._client = createClient({
      host: redisServer,
      port: 6379,
    });

    this._client.on('connect', () => {
      // console.log('Redis client connected to the server');
    });

    this._client.on('error', (err) => {
      console.log('Redis client not connected to the server: ', err);
    });
  }

  async get(key) {
    // gets redis values from db
    return promisify(this.client.get).bind(this.client)(key);
  }

  async set(key, value, duration) {
    // set redis key,value pair with expiration
    await promisify(this.client.setex).bind(this.client)(key, duration, value);
  }

  async del(key) {
    await promisify(this.client.del).bind(this.client)(key);
  }
  // set students(students) {
  //   if (Array.isArray(students)) {
  //     this._students = students;
  //   } else {
  //     throw new TypeError('Students must be an array');
  //   }
  // }
}
const redisClient = new RedisClient();
export default redisClient;
