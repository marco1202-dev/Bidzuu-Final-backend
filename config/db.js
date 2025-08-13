// db.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'bidzu_dev1',             // Database name
  'bidzu',                  // Database username
  'bidzu2025',          // Database password
  {
    host: 'bidzu-postgre.chsqicwm2bff.us-east-2.rds.amazonaws.com', // e.g. bidzu-db.xxxxxx.eu-west-1.rds.amazonaws.com
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
      ssl: {
        require: true,        // Force SSL
        rejectUnauthorized: false // Accept AWS self-signed certs
      }
    },
    logging: false // optional: disable logging
  }
);

module.exports = sequelize;
