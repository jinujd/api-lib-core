const commonConfigFns = require(`./common.config`);
commonConfigFns.reWriteEnvVars(); 

function mySqlQueryLogger ( queryString, queryObject ) {
  console.log('Query String:', queryString )      // outputs a string
  console.log('Params: ', queryObject.bind ) // outputs an array
}
//console.log("ENV VALUES ARE", process.env);
let dbConfig = {
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  dialect: 'mysql',
  dialectOptions: {
    connectTimeout: 60000
  },
  logging: process.env.IS_DB_LOGGING_ENABLED == "true"?mySqlQueryLogger :false,
  pool: {
    max: 9,
    min: 0,
    idle: 10000
  } 

};
console.log(`DB config identified is `, dbConfig)
module.exports = {
  local: {
    sql: dbConfig 
  },
  development: {
    sql: dbConfig 
  },
  qa: { 
    sql: dbConfig
  },
  prod: { 
    sql: dbConfig
  }
 
}
