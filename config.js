require('dotenv').config();

module.exports = {
  jwt: {
    secret: process.env.KEY,
    options: {
      algorithm: 'HS256',
      expiresIn: '10m'
    }
  }
};
