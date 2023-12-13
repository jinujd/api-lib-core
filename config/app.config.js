 const commonHelper = require(`./common.config`);
 commonHelper.reWriteEnvVars();
 
let secrets = process.env.CONFIG?JSON.parse(process.env.CONFIG): {JWT_SECRET: process.env.JWT_SECRET};
let jwtSecret = secrets.JWT_SECRET;
var commonConfiguration =  { 
  uploadConfig: {
    upload_paths: {

    },
    base_urls: {
      
    }
  },
  gateway: {
    url: "http://localhost:7050"
  }, 
  jwt: {
    expirySeconds: 60 * 60,
    secret: jwtSecret
  },
  response: {
    success: function(req, res,result) {
      res.send(result);
    },
    failure: function(req, res, result) {
      var ret = {
        success: 0,
        err: result
      };
      res.status(400).send(ret);
    }
  }, 
}; 
var qaConfig = commonConfiguration;
var devConfig = commonConfiguration;
var localConfig = commonConfiguration; 
module.exports = {   
  qa:qaConfig,  
  development: devConfig,
  local: localConfig
}
