const stringify = require('json-stringify-safe');
var multer = require('multer'); 
const _ = require('lodash');
const Validator = require("fastest-validator");
const validator = new Validator();
const ERROR_TYPE_VALIDATION_FAILURE = 'validation-failure';
const fs = require("fs");
let failedModels = [];

const callbackPathMapping = {};
module.exports = function(name,app,config,moduleName) {
    var that = this; 
    this.loadConfig = function(name, cb) {
        var results = null;
        var filePath = `config/${name}.config.js`;
        if(name) {
          var pathToCheck = `../${filePath}`;
          var pathToLoad = pathToCheck;  
          if(that.moduleName) {
            pathToCheck = `../../${filePath}`;
            var pathToLoad = `../${filePath}`;
          }
          console.log("Path to check is "+pathToCheck);
          console.log("Path to load is "+pathToLoad);
          
          if (fs.existsSync(pathToLoad)) { 
                console.log("Config exists");
          } else {
              console.log("Config does not exists");
          }
        }
        if(cb)
          cb.call(null);
    };
    this.getKebabCasedNameFromCamelCasedName = (camelCasedName) => {
        var kebabCasedName = null;
        //console.log(camelCasedName +" is the camel cased name");
        kebabCasedName = camelCasedName?camelCasedName.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase():kebabCasedName;
        
        if(kebabCasedName) {
            var firstCharInCamelCasedName = camelCasedName[0];
            firstCharInCamelCasedName = firstCharInCamelCasedName?firstCharInCamelCasedName.toLowerCase():firstCharInCamelCasedName;

            var firstCharInKebabCasedName = kebabCasedName[0]; 
            firstCharInKebabCasedName = firstCharInKebabCasedName?firstCharInKebabCasedName.toLowerCase():firstCharInKebabCasedName;
             
            if(firstCharInCamelCasedName != firstCharInKebabCasedName ) // some times the camelcased name  starts with -. So no need to remove that
                kebabCasedName = kebabCasedName.replace(/^-+|-+$/g, ''); // after replacement happened above using regex, an unwanted - is getting added as prefix. To remove that
        } 
        return kebabCasedName;
    };
    this.name = name;
    this.app = app;
    this.moduleName = moduleName;
    this.camelCasedName = name;
    this.kebabCasedName = this.getKebabCasedNameFromCamelCasedName(name); 
    this.kebabCasedModuleName = this.getKebabCasedNameFromCamelCasedName(moduleName); 
    const jwt = require('jsonwebtoken');
    this.options = {auth:true};
    var that = this;
    this.actionsWithoutAuth = [];
    this.get = function(path,fn,options) {
       // //console.log("Get route registered...");
        ////console.log("Path is this: "+path);
       // //console.log("Options in get is "+JSON.stringify(options));
        this.registerRoute('get',path,fn,options);
    };
    this.loadModel =  function(model,settings) {
        //console.log("Call received for load model with modelname as "+model);
        var path  = `../app/models/${model}.model.js`;
        if(this.moduleName) {
            //console.log("Module name idenfied inside loadModel fn is "+this.moduleName);
            path = `../app/modules/${this.moduleName}/models/${model}.model.js`;
        } else {
            //console.log("No module name idenfied inside loadModel fn");
        }
        //console.log("Loading model.. from path "+path);
        let sequelize = config.options.sequelize;
        let mongoose = config.options.mongoose;
        let dynamoose = config.options.dynamoose;
        if(!sequelize && !mongoose && !dynamoose) {
            failedModels.push(model);
            console.warn(`Model ${model} is not loaded as the database is not connected.`);
            return;
        }
        let defaultSettings = {
            isSequelizeModel: false,
            isMongooseModel: false,
            isDynamooseModel: false,
            autoDetect: true
        };
        settings = settings || defaultSettings;

        let loadSequelizeModel = false;
        let loadMongooseModel =  false;
        let loadDynamooseModel =  false;
        if(settings.autoDetect) {
            if(sequelize){
                loadSequelizeModel = true;
            } else if(mongoose){
                loadMongooseModel = true;
            }  else if(dynamoose) {
                loadDynamooseModel = true;
            }
        } else {
            loadSequelizeModel = settings.isSequelizeModel;
            loadMongooseModel = settings.isMongooseModel;
            loadDynamooseModel = settings.isDynamooseModel;
        }
        let ret = null;
        if(loadSequelizeModel) { 
            ret = require(path)(config.options.sequelize);
        } else if(loadMongooseModel){
            ret = require(path)(config.options.mongoose);
        } else if(loadDynamooseModel) {
            console.log("Loading dynamoose model");
            ret = require(path)(config.options.dynamoose);
        }
        //console.log("Loaded model");
        return ret;
    };
    this.checkIfMongooseObject = (obj) => {
        return _.get(obj, 'constructor.base') instanceof mongoose.Mongoose;
    }
    this.post = function(path,fn,options) {
        this.registerRoute('post',path,fn,options);
    };
    this.delete = function(path,fn,options) {
        this.registerRoute('delete',path,fn,options);
    };
    this.patch = function(path,fn,options) {
        this.registerRoute('patch',path,fn,options);
    };
    this.responses = {
        error: function(req, res, next, errors, type ) {
            console.log("Error response is called...moz");
            var httpStatus = 400;
            var success = false; 
            if(type == ERROR_TYPE_VALIDATION_FAILURE) {
                httpStatus  = 400; 
            }
            var response = {
                success: success,
                errors: errors
            };
            return res.send(response);
        } 
    };
    this.validate = function(req,options,cb) {
        console.log(`Req body`, req.body);
        console.log(`Req params`, req.params);
        console.log(`Req query`, req.query);
        if(options.$$validateIn) {
            var validateIn = options.$$validateIn;
            delete options.$$validateIn;
            var items = ['body','query','params'];
            for(var item of items) { 
                if(validateIn.indexOf(item) == -1) {
                    req[item] = {}; 
                }  
            }
        } 
        var queryParams =  req.query;
        var pathParams = req.params;
        var  bodyParams =  req.body;
        var params = {...queryParams,...pathParams,...bodyParams}; 
        var errors = null;
 
        var inputs = params;
        var result = validator.validate(inputs, options); 
        cb.call(null,result);
    }

    this.registerRouteV1 = function(method,path,cb,options) {
        var that = this;
        var kebabCasedName = this.kebabCasedName;
        var kebabCasedModuleName = this.kebabCasedModuleName;
        //console.log("\\n\\n\\n\\n\\n\\n\\nCalling n"); 
        path  = path.replace(/\/\//g, "/");
        var fn = cb;
        if(options.validations) {
            //console.log("Validations are there for "+method+" "+path);
            fn = (req,res,next)=>{
                var validations  = options.validations;
                if( validations.onFailure == undefined ) {
                   validations.onFailure = this.responses.error;
                }
                console.log(stringify(options)); 
                var validatorOrig = Object.assign({}, validator);
                var onSuccess =  validations.onSuccess;
                var onFailure =  validations.onFailure;
             //   delete validations.onSuccess;
               // delete validations.onFailure;
                //onFailure();
                
                validations =  JSON.parse(JSON.stringify(validations));
                that.validate(req,validations, function(result) { 
                    console.log("Result is "+JSON.stringify(result));
                    if(result == true) { 
                        if(cb) {
                            cb.call(null,req,res,next);
                        }  
                    } else {
                        onFailure(req,res,next,result, ERROR_TYPE_VALIDATION_FAILURE);
                    }
                });
            }
            
        } 

        
       console.log("Registering route "+method.toUpperCase()+" "+path+" with options "+JSON.stringify(options));
        if(!fn) {
            console.log("Unable to register route "+method.toUpperCase()+" "+path+", callback function is undefined...");
            return;
        };
        var methods = ["get","post","put","patch","delete","head"];
        if(methods.indexOf(method) == -1) {
            //console.log("Invalid method "+method+" passed to registerRoute. Available methods are "+methods);
            return;
        }
        options = options?options:this.options;
        //console.log("Options received: "+JSON.stringify(options));
        if(!options.useAbsolutePath) {
           var pathPrefix = `${kebabCasedName}`;
           if(kebabCasedModuleName) {
            pathPrefix = `${kebabCasedModuleName}/${pathPrefix}`;
           }
           pathPrefix = `/${pathPrefix}`;
           //console.log("Path prefix is "+pathPrefix);
           //console.log("Path is "+path);
           path = `${pathPrefix}${path}`;
        }
        //console.log("Path being registered is "+path);
        //var path = options.useAbsolutePath?path:`/${kebabCasedModuleName}/${kebabCasedName}/${path}`;
        //console.log("Options  is "+JSON.stringify(options));
        path  = path.replace(/\/\//g, "/");
        if(!options.auth) {
            //console.log("Authorization not needed");
            this.actionsWithoutAuth[method] = !this.actionsWithoutAuth[method]?[]:this.actionsWithoutAuth[method];
            this.actionsWithoutAuth[method].push(path);
            //console.log(this.actionsWithoutAuth);
        } else {
            //console.log("Authorization is needed");
        }
        //console.log("Registering route "+method+" "+path);
        //console.log(`app.${method}('${path}',fn)`);
        // app.use(path, function(req,res,next) { 
        //     var params = req.params;
        //     authHandler(path,params,req,res,next);
        //     //console.log("Req params are "+JSON.stringify(req.params));
        // });
        // app[method](path,fn);
        var param2 = function(req,res,next) {  
            //next(); 
           // fn();
            var params = req.params; 
            authHandler(path,params,req,res,next); 
            //console.log("Req params are "+JSON.stringify(req.params));
         }; 
         var param3 = null; 
         if(!options.multer) {  
            app.use(path, param2 ); 
            app[method](path, fn); 
         } else{ 
            param3 = param2;
            param2 = (options.multer)(multer); 
            app[method](path, param2, function(req,res,next) { 
                var params = req.params;
                authHandler(path,params,req,res,function() { 
                    fn.call(null,req,res,next);
                }); 
                //
            }); 
            console.log("Path: "+path);
            //app.use(path, param2, param3 ); // for authorization
         }
    };
    this.cleanPath = (path) =>  {
        return path.replace(/\/\//g, "/");;
    }
    this.getValidationFn = (options, cb) => {
        return (req,res,next) => { 
            let validations  = options.validations;  
            console.log(`Identified validations are`, validations);
            const onFailure =  validations.onFailure || this.responses.error; 
            validations =  JSON.parse(JSON.stringify(validations));
            this.validate(req, validations, (result) => {
                console.log(`Validation result`, result);  
                if(result !== true) return onFailure(req,res,next,result, ERROR_TYPE_VALIDATION_FAILURE);
                cb(req,res,next);  
            });
        };

    }
    this.getPathToUse = (path, options) => {  
        path = this.cleanPath(path);
        if(options.useAbsolutePath) return path;
        const kebabCasedName = this.kebabCasedName;
        const kebabCasedModuleName = this.kebabCasedModuleName; 

        let pathPrefix = `${kebabCasedName}`;
        if(kebabCasedModuleName) 
            pathPrefix = `${kebabCasedModuleName}/${pathPrefix}`;    
        pathPrefix = `/${pathPrefix}`; 
        path = `${pathPrefix}${path}`; 
        return this.cleanPath(path);
    }
    
    this.getFileFieldRules = (validators) => {
        // filters out file fields
        return {};

        /**
         * Sample file rule
         *  image: {
                type: "file", optional: true, min: 100, max: 200, multiple: false, 
                filter: () => {

                },
                filename: () => {
                    
                },
                uploadPath: ''
            },
         */
        const result = {};
        for(let field in validators) {
            const rule = validators[field];
            if(field.type == 'file') result[field] = rule;
        }
        return result; 
    }
    this.getFileUploadHandler = (fileFieldRules) => {

        
    }
    this.makeFileNameUnique = (fileAbsPath, orginalPath, index = 0) => {
        if (!fileAbsPath) return fileAbsPath;
        orginalPath = orginalPath ? orginalPath : fileAbsPath;
        if (!fs.existsSync(fileAbsPath)) 
            return fileAbsPath;
        else {
            index++; 
            const fileAbsPathParts = orginalPath.split(".");
            const positionToModify = fileAbsPathParts.length == 1?0: ( fileAbsPathParts.length - 2 );
            fileAbsPathParts[positionToModify] += "-" + index;
            fileAbsPath = fileAbsPathParts.join(".");
            return this.makeFileNameUnique(fileAbsPath, orginalPath, index);
        }
    } 
    this.registerRoute = (method,path,cb,options) => { 

        const allowedMethods = ["get","post","put","patch","delete","head"];
        if(allowedMethods.indexOf(method) == -1) return;       

        path = this.getPathToUse(path, options);
 
        if(!cb) return console.log("Unable to register route "+method.toUpperCase()+" "+path+", callback  undefined...");
        const {fn, fileFieldRules} = !options.validations? {fn: cb, fileFieldRules: null}: {
            fn: this.getValidationFn(options, cb), 
            fileFieldRules: this.getFileFieldRules(options.validations)
        };
        // for(field of fileFieldRules) 
        //     delete options.validations[field];
        //const fileUploadHandler = this.getFileUploadHandler(fileFieldRules);
        //const fn = options.validations? this.getValidationFn(options, cb): cb; 

        options = options?options:this.options; 
        
        if(!options.auth) { 
            this.actionsWithoutAuth[method] = !this.actionsWithoutAuth[method]?[]:this.actionsWithoutAuth[method];
            this.actionsWithoutAuth[method].push(path); 
        }   
        options.isFormData = options.isFormData || false;
        if(options.isFormData && !options.multer) 
            options.multer = (multerRef) =>  multer().any()
        
        
        if(options.multer) 
            options.isFormData = true;  
            
         if(!options.isFormData)  
            app[method](path, (req, res, next) => { 
                (getPathHandler)(path)(req, res, null); 
                if(!res.headersSent) 
                    fn(req, res, next);  
            });
        else  
            app[method](path, (options.multer)(multer), function(req, res, next) { 
                console.log(`Req body`, req.body);
                (getPathHandler(path, fn, method))(req, res, next);
            });  

        //console.log(`Registered route ${method} ${path}`)
         
    }; 
     
    const getPathHandler = (path, cb = null, method = null) => {
        if(cb) {
            // console.log(`Setting callback pathmapping for`, path);
            callbackPathMapping[`${method} ${path}`] = cb;
            // console.log("mapping", callbackPathMapping);
        }
        return (req,res,next) => {  
            const params = req.params;  
            
            //console.log(`Original url`, req.originalUrl);
            // console.log(`Is call from middleware`, req.route == undefined);
            // console.log(`PATH RECEIVED ISS ${req.method}`, path);
            // console.log(`Identified CB path mapping`, callbackPathMapping);
            const cbKey = method&& path?`${method} ${path}`: null;
            // console.log(`CB key is`, cbKey);
            const nextFn = !(cbKey&&callbackPathMapping[cbKey]) ? next: () => callbackPathMapping[cbKey](req,res,next); 
            //req.route won't be available inside middleware which is called when no formdata is present
            //console.log(`Calling auth handler...`);
            //console.log(`Next fn to call is`, nextFn);
            authHandler(path,params,req, res, nextFn);  
        };   
    }
    function authHandler(path, params, req, res, next){   
        //console.log("Path is received in auth handler is "+path);
        var route = app.route(path);
        if(route && route.path) {
            path = route.path;
        }  
        if(!path) { 
            return;
        }
        path  = path.replace(/\/\//g, "/");
        // console.log("path is "+ path);
        var method =  req.method.toLowerCase();
        // console.log(`Method`, method);
        //console.log(`Actionswithout auth`, that.actionsWithoutAuth);
        var noAuthActions  =  that.actionsWithoutAuth[method]?that.actionsWithoutAuth[method]:[];
        //console.log("No auth actions are...", noAuthActions); 
        const bearerHeader = req.headers['authorization'];
        // console.log(`Bearer header is`, bearerHeader);
        let hasBearerToken = true;
        let isBearerTokenValid = false;
        let isActionWithAuth = noAuthActions.indexOf(path) == -1;
        var bearer = null;
        var token = null;
        if (typeof bearerHeader == 'undefined' || !(bearer = bearerHeader.trim().split(' ')) || !(token = bearer[1])) { 
            hasBearerToken = false;
        }
        let proceedNext = () => {
            let hasValidToken = hasBearerToken && isBearerTokenValid; 
            // console.log(`hasValidToken`, hasValidToken);
            // console.log(`isActionWithAuth`, isActionWithAuth);
            if(isActionWithAuth && !hasValidToken) {
                // console.log(`Sending 401 response`);
                //console.log(`Res`, res);
                try { 
                    return res.sendStatus(401);  
                } catch(err) {
                    console.log(`Error catched`, err);
                }

            } 
            if(next) 
                next.call(); 
        }
        // console.log("hasBearerToken", hasBearerToken);
        if(token)
            console.log(`TOKEN`, token);
            
        if(isActionWithAuth && hasBearerToken) {
            //console.log(`JWT secret is ${config.jwt.secret}`);
            jwt.verify(token, config.jwt.secret, (err, authData) => {   
                if (err) {
                    console.log(`JWT verification err`, err);
                    isBearerTokenValid =  false; 
                } else {
                    isBearerTokenValid = true; 
                    req.identity = authData; 
                }
            });
            proceedNext();
        } else {
            //console.log(`No bearer token identified. Calling next callback`, proceedNext);
            proceedNext();
        } 
    }
}