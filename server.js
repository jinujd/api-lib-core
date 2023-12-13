process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0; //don't validate ssl
const express = require('express'); 
var requestUuid = require('express-request-id')();
var cors = require('cors');
const bodyParser = require('body-parser');
var consoleArguments = require('minimist');
const { Parser } = require('json2csv');
const logApiInfo = require('./request-logger.js')

// const formidableMiddleware = require('express-formidable');// for form data, files, and normal json data
var argv = consoleArguments(process.argv.slice(2));
const fs = require("fs");
const path = require('path');
// Configuring the database
var env = process.env.NODE_ENV;
env = env ? env : "development";
//console.log("Environment is " + env);
var dbConfig = null; 
var params = null;
var gateway = null;
let Sequelize = null;
let mongoose = null;
let dynamoose = null;
const Controller = require('./base/controller.js');
const { result } = require('lodash');
const exp = require('constants');
const headersToExpose = [`Content-Disposition`, `x-developed-by`];
const allowedHeaders = headersToExpose; // headers for preflight request
const exposedHeaders =  headersToExpose// esp. for filename in csv export

var sequelize = null; 
//jwttoken and verification


// create express app
const app = express();

// app.use(formidableMiddleware());
app.use(cors({allowedHeaders, exposedHeaders}));
app.use(requestUuid);

app.use(bodyParser.json());
//app.use(bodyParser.json({limit: '50mb'}));
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: true
}));

/**
 * app.use(bodyParser.urlencoded({
  extended: true,
  limit: '50mb',
  parameterLimit: 50000,
}));
 */
app.use((req, res, next) => { // csv export 
  const send = res.send; 
  res.send = (data) => {
    data = JSON.parse(JSON.stringify(data));
    res.send = send; 
    const {headers} = req; 
    const responseTypeHeaderName = `x-response-type`;
    const isResponseToBeCsv = headers[responseTypeHeaderName] && headers[responseTypeHeaderName] == `csv`;
    if(isResponseToBeCsv) { 
      const itemsFieldName = headers[`x-items-field`] || `items`;
      let fileName = headers[`x-file-name`] || `data.csv`;  
      fileName = fileName.endsWith(`.csv`)? fileName: `${fileName}.csv`;
      data = data[itemsFieldName] || [];
      const fieldsToIgnore = (headers[`x-exclude-fields`] || ``).split(`,`);
      const isFieldsToBePrettified = parseInt(headers[`x-prettify-field-names`] || 1)? true: false;
      const valueMappings = JSON.parse(headers[`x-field-value-mappings`] || `{}`) || {}; 
      const fieldFlatteningMappings = JSON.parse(headers[`x-field-flattening-mappings`] || {});
      const fieldNameMappings = JSON.parse(headers[`x-field-name-mappings`] || `{}`) || {}; 
      const mapValues = (item) => { 
        for(let field in item) { 
          const valueMapping = valueMappings[field];
          let val = item[field];
          const flatteningMapping = fieldFlatteningMappings[field];
          if(flatteningMapping) { 
            const keys = flatteningMapping.split(`.`);
            let currentVal = val;
            if(currentVal) 
              for(let key of keys) {
                currentVal = currentVal[key];
                if(currentVal == undefined || currentVal == null) break;
              }
            val = currentVal;
          }
          if(valueMapping) 
            val = valueMapping[val] || val;  
          
          item[field] = val;
        } 
        return item;
      };

      let fields = new Set();
      const transforms = [mapValues];
      data.forEach((item) => {
        for(let field in fieldNameMappings) 
          if(fieldNameMappings[field]) { 
            item[fieldNameMappings[field]] = item[field];
            fieldsToIgnore.push(field);
          }
        
        fieldsToIgnore.forEach(field => delete item[field]); 
        Object.keys(item).forEach(key => fields.add(key));
      });
      fields = Array.from(fields).map((field) => {
        return {
          label: isFieldsToBePrettified? snakeCaseToSpaceCase(field): field,
          value: field
        }
      }); 
      // const fields = Array.from(data.reduce((result, item) =>  {  
      //   Object.keys(item).forEach(key => result.add(key));
      //   return result;
      // }, new Set())).map((field) => {
      //   return {
      //     label: isFieldsToBePrettified? snakeCaseToSpaceCase(field): field,
      //     value: field
      //   }
      // });  
      //console.log(`Fields are`, fields);
      const opts = { fields, transforms }; 
			const parser = new Parser(opts);
			data = parser.parse(data); 
    //   console.log(`Response headers`, res.getHeaders());
    //   let exposedHeaders = (res.getHeader(`Access-Control-Expose-Headers`) || '').split(`,`).map(name =>  name.trim()).filter(header => (header !== undefined) && (header !== null) && (header !== "") );
    //   exposedHeaders.push(`Content-Disposition`);
    //   exposedHeaders = exposedHeaders.join(`,`);
    //   res.setHeader('Access-Control-Expose-Headers', exposedHeaders);
    //  ///res.set('Access-Control-Allow-Headers', exposedHeaders);
    //   console.log(`Exposed headers are`, exposedHeaders);
    //   //res.setHeader(`Content-Disposition`, `attachment; filename="${fileName}"`); 
			res.attachment(fileName).send(data); 
      
      
      //console.log(`Attachment filename is`, fileName); 
    } else 
      res.send(data);
    
  }
  next()
})
var CURRENT_WORKING_DIR = process.cwd();
//console.log("Current working directory is "+CURRENT_WORKING_DIR);
var APP_DIR = "./app/";
var CURRENT_MODULE =  getCurrentModule(); //null or name of the module
const PATH_SEPARATOR =  path.sep; 

CURRENT_WORKING_DIR += CURRENT_WORKING_DIR.endsWith("/") ? "" : "/";
 
function isFunction(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}
function getCurrentModule() {
  //console.log("Identifying current module");
  CURRENT_WORKING_DIR = CURRENT_WORKING_DIR.replace(/\//g,"\\");
  //console.log("Working directory is "+CURRENT_WORKING_DIR);
  var tmp  = CURRENT_WORKING_DIR.split("\\");
  // console.log("CWD path after splitting");
  // console.log(tmp);
  var index = tmp.length-2;
  var ret = null;
  //console.log("Index for keyword modules should be "+index);
  //console.log("Checking whether the keyword module is present at index");
  if(index && (tmp[index] == "modules")) {
    //console.log("Module is present.");
    ret = tmp[index+1];
    //console.log("Module name is identified as "+ret);
  } else {
    //console.log("Module is not present");
  }
  return ret;
}
function sanitizePath(str) {
   //str += str.endsWith(PATH_SEPARATOR) ? "" : PATH_SEPARATOR;
   str =  str.replace(/\\/g,"/");
   str += str.endsWith("/") ? "" : "/";
   return str;
}
function getFileFromPaths(paths, file) { 
  var ret = null;
  var i = 0;
  var ln = paths.length; 
  var path = null;
  while(i<ln) {
    path = paths[i]; 
    path = sanitizePath(path);
    path += file; 
    if (fs.existsSync(path)) { 
      ret = path;
    }  
    i++;
  }
  return ret;
}
function loadConfigForEnv(configFilePath,env, cb) {
  var ret = {};
  var loadedConfig = require(`./config/${configFilePath}`);
  let cb2 = (config) => {
    if (!config) {
      config = {}; 
    }
    if(!config[env]) {
      config[env] = {};
    }
    config = config[env]; 
    cb(config);
  }
  if(isFunction(loadedConfig)) { 
    loadedConfig(env,cb2); 
  } else { 
    if(cb) {
      cb2(loadedConfig);
    }
  } 
}
function kebabCaseToSpaceCase(str) {
    let arr = str.split('-');
    let capital = arr.map((item, index) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase());
    return capital.join(" ");
}
function snakeCaseToPascalCase(snakeCaseStr) {
	return snakeCaseStr.split("/")
    .map(snake => snake.split("_")
      .map(substr => substr.charAt(0)
        .toUpperCase() +
        substr.slice(1))
      .join(""))
    .join("/");
 }
 function snakeCaseToSpaceCase(snakeCaseStr) {
  return snakeCaseStr.split("/")
    .map(snake => snake.split("_")
      .map(substr => substr.charAt(0)
        .toUpperCase() +
        substr.slice(1))
      .join(" "))
    .join("/");
 }
  
function getLookUpPathForItem(item) {//item => controller or model etc.
  var ret = [
    APP_DIR+item+"/",
  ]; 
  if(CURRENT_MODULE) {
    ret.push("./"+item+"/");
  }
  ret = removeDuplicates(ret); 
  return ret;
}
function removeDuplicates(arr) {
  var obj = {};
  var retArr = [];
  for (var i = 0; i < arr.length; i++) {
      obj[arr[i]] = true;
  }
  for (var key in obj) {
      retArr.push(key);
  }
  return retArr;
}
const Server = {
  port: null,
  serviceName: null,
  routes: null,
  serviceConfig: {},
  environment: process.env,
  arguments: argv,
  options: {},
  methods: null,
  onBeforeStart:  () => {
    //console.log(`Starting server on port ${Server.port}`); 
  },
  onAfterStart: () => { 
    console.info(`Server is listening on port ${Server.port}`);
  },
  connectToAllDbs: (dbSettings, cb, idx, ret) => {
    ret = ret || {};
    idx = idx != undefined? idx: 0;
    let dbSetting = null;
    if(!(dbSetting = dbSettings[idx])) {
      if(cb) {
        cb(ret);
      }
      return;
    } 
    idx++;
    let connectFn = dbSetting.fn;
    let dbName = dbSetting.name;
    let outputFieldName = dbSetting.outputField;
    let connectionConfig = dbConfig[dbName]; 
    if(!connectFn || !connectionConfig) { 
      return Server.connectToAllDbs(dbSettings,cb, idx, ret);
    }  else { 
      connectFn(connectionConfig, (connectionObj) => {
        if(connectionObj){
          ret[outputFieldName] = connectionObj;
        } else {
          console.log(`Connection to ${dbName} failed.`);
        }
        Server.connectToAllDbs(dbSettings, cb, idx, ret);
      }); 
    }

  },
  connectToDb: function(callback) {  
    var that = this;
    dbConfig = dbConfig || {};
  
   
    
    this.connectToMysqlDb(dbConfig.sql,function(sequelize){
      that.connectToMongoDb(dbConfig.mongo, function(mongoose) {
        callback({
            sequelize:sequelize,
            mongoose: mongoose
        }); 
      });
    })
},
connectToMysqlDb: function (dbConfig,callback) {
  console.log("Trying to connect to mysql..");
  console.log("Database Config -> " + JSON.stringify(dbConfig, null,5));
 if(!dbConfig) {
    console.info("No mysql configuration found");
    (callback).call();
    return;
 }
 if(!Sequelize){
  Sequelize = require('sequelize');
 }
 sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password,dbConfig);
 sequelize
   .authenticate()
   .then(() => {
     console.log('Connected to sql');
     if (callback) {
       callback(sequelize);
     }
   })
   .catch(err => { 
      console.warn('Could not connect to sql database.', err); 
     (callback.call)(null); 
   });
},
connectToDynamoDb: function(dbConfig, callback) { 
 console.log("Connecting to dynamo db");
  var config = dbConfig;
  if(!dynamoose){
    dynamoose = require('dynamoose');
  }
  if(config) {
    if(config.aws) {
      dynamoose.aws.sdk.config.update(config.aws);
    } else if(config.ddb) {
        const ddb = new dynamoose.aws.sdk.DynamoDB(ddb);
        dynamoose.aws.ddb.set(ddb);
    } else if(config.local) {
      let localConfig = config.local;
      if(!localConfig.url) {
        dynamoose.aws.ddb.local();
      } else {
        dynamoose.aws.ddb.local(localConfig.url);
      }
    }
    if(config.connectionCallback) {
      return config.connectionCallback(dynamoose, () => {
        callback(dynamoose);
      });
    }
  } 
  callback(dynamoose);
},
connectToMongoDb: function(dbConfig, callback) { 
  if(!dbConfig) {
    console.info("No mongodb configuration found");
    (callback).call();
    return;
  } 
  var config = dbConfig;
  console.log("Mongodb config is "+JSON.stringify(dbConfig));
  var url = config.url;
  delete config.url; 
  
 if(!mongoose){
  mongoose = require('mongoose');
 }
  mongoose.connect(url, config).then(() => {
    console.log("Connected to mongodb");
    if (callback) {
      (callback.call)(null,mongoose);
    }
  }).catch(err => {
    console.warn('Could not connect to mongodb.', err); 
    (callback.call)(null);
  });
},
  methods: { 
    loadController: function (controller, options) {
      //console.log("Loading controller "+controller);
      var defaultJWTSecret = "myapp";
      var defaultJWTConfig =  {
        secret: defaultJWTSecret
      };
      var config = params ? params : defaultJWTConfig;
      config.jwt = config.jwt?config.jwt: defaultJWTConfig;
      config.jwt.secret = config.jwt.secret?config.jwt.secret: defaultJWTSecret;
       
      config.options = options;  
      
      var controllerBaseObj = new Controller(controller, app, config,CURRENT_MODULE);

      var cpath = './app/controllers/' + controller + ".controller.js";
      var pathsToCheck = getLookUpPathForItem("controllers");
       
      var controllerFileName =  controller + ".controller.js";
      var cpath = getFileFromPaths(pathsToCheck,controllerFileName);
      if(!cpath) { 
        console.error("Controller file with name "+controller+".controller.js does not exits");
        var ret = new function() {
         this.methods = controllerBaseObj
        };
        return ret;
      } 
      var pathToRequire = `./app/controllers/${controllerFileName}`;
      if(CURRENT_MODULE) {
        var pathToRequire = `${BASE_PATH}/app/modules/${CURRENT_MODULE}/controllers/${controllerFileName}`;
      }
      //console.log("Loading path "+pathToRequire);
      var controller = require(pathToRequire);
    
      controller = new controller(controllerBaseObj, options);
      var cName =  controller.name;
      //console.log(JSON.stringify(cName));



      controller.methods = controllerBaseObj;
      controller.options = options;
      controller.module = CURRENT_MODULE;
      controller.env  = env;
      return controller;
    }
  },
  listenOnPort: () => { 
    app.listen(Server.port, () => { 
      if(Server.onAfterStart !==  undefined) {
        Server.onAfterStart(this.listenOnPort);
      }  
    }); 
  },
  onAfterDbsConnected: async (connectedDbs) => { 
      
      var options = connectedDbs;
      Server.options = options;
      if (Server.routes) {
        var len = Server.routes.length ? Server.routes.length : 0;
        var i = 0;
        var route = null;
        while (i < len) {
          route = Server.routes[i]; 
          var routeFile = `./app/routes/${route}.routes.js`; 
          if(CURRENT_MODULE) {
            routeFile = `./app/modules/${CURRENT_MODULE}/routes/${route}.routes.js`;
          }
          require(routeFile)(app, Server.methods, options); 
          i++;
        }
        
        if(Server.onBeforeStart !==  undefined) { 
          await Server.onBeforeStart();
        }    
        Server.listenOnPort();      
      } else {
        console.log("No routes identified..");
      }
  },
  start: async function (serviceName, routes, BASE_PATH ,serviceConfig) {

    console.log("Starting the app...");
    if(!serviceConfig) {
      serviceConfig = { };
    } 
    var port = this.environment.SERVICE_PORT ? this.environment.SERVICE_PORT : null;
    port = port ? port : this.arguments.SERVICE_PORT ? this.arguments.SERVICE_PORT : null;
    port = port? port : serviceConfig.port;
    if (!port) {
      console.error("PORT not set for " + serviceName + " service. Exiting..."); 
      process.exit(0);
    }
    console.log(`App port is ${port}`);
    this.serviceName = serviceName;
    this.serviceConfig = serviceConfig;
    this.port = port;
    this.routes = routes;

    if(!serviceConfig.db) {
      serviceConfig.db = "database.config";
    } 
    if(!serviceConfig.params) {
      serviceConfig.app = "app.config";
    } 
    loadConfigForEnv(serviceConfig.db,env,(dbConfigForEnv) => { 
      dbConfig = dbConfigForEnv;
      //console.log("Db config is");
      //console.log(dbConfig);
      loadConfigForEnv(serviceConfig.app,env, (paramsForEnv) => {
          params = paramsForEnv;
          var gatewayConfig = params.gateway?params.gateway:{url:""};
          gateway = require('./app/components/gateway.component')(gatewayConfig); 
          var that = this;  
          const dbSettings = [
            {
              name: 'sql',
              fn: Server.connectToMysqlDb,
              outputField: 'sequelize'
            }, 
            {
              name: 'mongo',
              fn: Server.connectToMongoDb,
              outputField: 'mongoose'
            }, 
            {
              name: 'dynamo',
              fn: Server.connectToDynamoDb,
              outputField: 'dynamoose'
            }
          ];  
          this.connectToAllDbs(dbSettings, async (connectedDbs) => { 
            //console.log("Connected dbs are");
            await this.onAfterDbsConnected(connectedDbs);
          }); 
          
      });  
      
    }); 
  } 
};
logApiInfo(app);
module.exports = Server;