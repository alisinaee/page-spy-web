import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'config.json');
const KEY = 'maxLogLifeTimeOfHour';
const HOURS = 168;

// Upstream example shape, with only the lifetime changed to 7 days.
// Used when config.json is missing so a one-key file is not the thing the API starts with.
const created = {
  port: '6752',
  maxLogFileSizeOfMB: 10240,
  maxLogLifeTimeOfHour: HOURS,
  notAllowedDeleteLog: false,
  maxRoomNumber: 500,
  corsConfig: {
    allowOrigins: ['*'],
    allowHeaders: [
      'Origin',
      'Authorization',
      'Content-Length',
      'X-Request-Id',
      'Content-Type',
      'Referer',
      'User-Agent',
      'Host',
    ],
    allowMethods: [
      'HEAD',
      'POST',
      'GET',
      'OPTIONS',
      'PUT',
      'DELETE',
      'UPDATE',
    ],
    exposeHeaders: ['X-Request-Id'],
  },
  storageConfig: {
    baseDir: '',
    keyId: '',
    secret: '',
    bucket: '',
    region: '',
    endpoint: '',
    s3ForcePathStyle: false,
  },
  authConfig: {
    password: '',
    jwtSecret: '',
    tokenExpiration: 720,
  },
};

const write = (value) => {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
};

if (!fs.existsSync(file)) {
  write(created);
  console.log('config.json created with maxLogLifeTimeOfHour 168');
} else {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.warn(
      'config.json was left unchanged because it is not strict JSON.',
    );
    process.exit(0);
  }
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    console.warn('config.json was left unchanged because it is not an object.');
    process.exit(0);
  }
  if (data[KEY] === undefined || data[KEY] === null || data[KEY] === '') {
    data[KEY] = HOURS;
    write(data);
    console.log('maxLogLifeTimeOfHour set to 168');
  } else {
    console.log('keeping maxLogLifeTimeOfHour ' + data[KEY]);
  }
}
