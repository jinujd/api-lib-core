const helper = { 
    getMulterV2: (fieldNames, bucket, multer) => {
        //console.log(`Uploading to bucket ${bucket}`);
        fieldNames = !Array.isArray(fieldNames)? [fieldNames]: fieldNames;
        const s3 = new S3Client()
        const storage = multerS3({
            s3: s3,
            bucket,
            metadata: function (req, file, cb) {
                cb(null, {fieldName: file.fieldname});
            },
            key: function (req, file, cb) { 
                const fileNameParts = file.originalname.split(".").filter(filePart=>filePart);
                const prefix = Date.now().toString();
                let fileName = file.originalname || prefix;
                const hasExtension = fileName.includes(`.`); 
                if(hasExtension) {
                    if(fileNameParts.length == 1) {  
                    fileNameParts.unshift(prefix);
                    } else if(fileNameParts.length == 0){
                    fileNameParts.push(prefix)
                    } else {
                    let name = fileNameParts[0].trim();
                    name = name? `${prefix}-${name}`: prefix;
                    fileNameParts[0] = name;
                    }
                    fileName = fileNameParts.join(".");
                } else 
                    fileName = `${prefix}-${fileName}`;
                console.log(`Filename is ${fileName}`);
                cb(null, fileName)
            }
        })
        const upload = multer({ storage }); 
        return fieldNames.length == 1? upload.single(fieldNames[0]): upload.fields(fieldNames.map((name) =>  {
            return {name};
        }));  
    },

    getMulter: (fieldNames, uploadPath, multer) => {
        return helper.getMulterV2(fieldNames, uploadPath, multer);  
        //console.log(`Multer config is fieldNames`, fieldNames, `uploadPath`, uploadPath );
        fieldNames = !Array.isArray(fieldNames)? [fieldNames]: fieldNames;
        const storage = multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, uploadPath)
            },
            // fileFilter: (req, file, cb) => {
            // 	console.log(`body params with file are`, req.body);
            // 	cb(null, true);
            // },
            filename: function (req, file, cb) {
                console.log(`Creating file name...`);
                const imagePath = (`${uploadPath}${file.originalname}`).replace(/\s+/g, '-').toLowerCase();
                console.log(`File path is`, imagePath);  
                cb(null, helper.makeFileNameUnique(imagePath).replace(uploadPath, ""))
            } 
        });
        const upload = multer({ storage });
        //console.log(`Field names`, fieldNames);
        return fieldNames.length == 1? upload.single(fieldNames[0]): upload.fields(fieldNames.map((name) =>  {
            return {name};
        }));  
    },

    makeFileNameUnique: (fileAbsPath, orginalPath, index) => { 
        if (!fileAbsPath) return fileAbsPath;
        orginalPath = orginalPath ? orginalPath : fileAbsPath;
        if (!fs.existsSync(fileAbsPath)) {
            //console.log("File "+fileAbsPath+" does not exist. No renaming needed");
            console.log(`Saved file path is`, fileAbsPath);
            return fileAbsPath;
        } else {
            index = index ? index : 0;
            index++;
            var fileAbsPathParts = orginalPath.split(".");
            var positionToModify = fileAbsPathParts.length - 2;
            if (fileAbsPathParts.length == 1) {
                positionToModify = 0;
            }
            fileAbsPathParts[positionToModify] += "-" + index;
            fileAbsPath = fileAbsPathParts.join(".");
            return helper.makeFileNameUnique(fileAbsPath, orginalPath, index);
        }
    },

    getUniqueId: () => {
        return uuidv4();
    },


    getCurrentUnixTs: () => Math.floor(new Date().getTime() / 1000),
    getUnixTsAfter(seconds) {
        const now = (new Date).setMinutes();

    },
    getDataFromCsvFile: (filePath, cb, settings) => {
        settings  =  settings || {headers: false};
        let results = [];
        fs.createReadStream(filePath).pipe(csv(settings)).on('data', (data) => results.push(data)).on('end', () => {
            cb(results);
        });
    },
    isDateValid: (dateStr, formatStr) => { 
        formatStr = formatStr?formatStr: "YYYY-MM-DD";
        return moment(dateStr, formatStr).format(formatStr) === dateStr;
    },
    calculateAge: (dobStr) => {//YYYY-MM-DD
        let age = moment().diff(dobStr, 'years',false);
        return age;
    },
    snakeCaseToPascalCase: (snakeCaseStr) => {
        let pascalCaseStr =  snakeCaseStr.split("/")
        .map(snake => snake.split("_")
        .map(substr => substr.charAt(0)
            .toUpperCase() +
            substr.slice(1))
        .join(""))
        .join("/");;
        return pascalCaseStr;
    },
    snakeCaseToCamelCase: (snakeCaseStr) => {
        let pascalCaseStr =  snakeCaseStr.split("/")
        .map(snake => snake.split("_")
        .map(substr => substr.charAt(0)
            .toLowerCase() +
            substr.slice(1))
        .join(""))
        .join("/");;
        return pascalCaseStr;
    },
    camelCaseToSnakeCase: (camelCaseStr) => {
        return camelCaseStr.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    },
    spaceCaseToSnakeCase: (spaceCaseStr) => {
        return spaceCaseStr.replace(/[A-Z]/g, letter => letter.toLowerCase()).replace(/ /g,`_`);
    },
    arrOfArrsToArrOfObjs: (arrOfArrs, columnPositions, startRow = 0, valueTransformFn = (col, val) => val) => {
        return arrOfArrs.map((arr, index) => {
            if(index<startRow) return;
            const obj = {};
            for(let col in columnPositions) 
                obj[col] = valueTransformFn(col, arr[columnPositions[col]] !== undefined? arr[columnPositions[col]]: null);
            return obj;
        }).filter(elm => elm !== undefined);
    },
    snakeCaseToSpaceCase: (snakeCaseStr, doNothing = false) => {
        if(doNothing) return snakeCaseStr;
        let spaceCaseStr =  snakeCaseStr.split("/")
        .map(snake => snake.split("_")
        .map(substr => substr.charAt(0)
            .toUpperCase() +
            substr.slice(1))
        .join(" "))
        .join("/");
        return spaceCaseStr;
    },
    isRegExValid: (regex) => {
        let isValid = true;
        console.log("testing validity of reg ex "+regex );
        try {
            new RegExp(regex);
        } catch(e) {
            console.log("Reg ex is invalid");
            isValid = false;
        }
        return isValid;
    },
    generatePasswordHash: (password) => {
        let salt = bcrypt.genSaltSync(10);
        let hash = bcrypt.hashSync(password, salt);
        return hash;
    },
    isPasswordMatchingWithPasswordHash: (password, passwordHash) => {
        console.log(`${password} - ${passwordHash}`);
        if(!password || !passwordHash) {
            return false;
        } 
        let ret = bcrypt.compareSync(password, passwordHash); 
        console.log(ret);
        return ret;
    },
    isPasswordStrong: (password) => {
        let regex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{6,16}$/;//min a lower case, upper case , number and special - characters. 
        try {  
            ret = regex.test(password); 
            return ret;
        } catch(e) { 
            console.log("regex error");
            console.log(e);
            return ret; // reg ex is invalid.  
        } 
    },
    enumerateDaysBetweenDates: (startDate, endDate, format) => {
        format = format?format: "YYYY-MM-DD";
        let dates = [];
        while(moment(startDate) <= moment(endDate)){
        dates.push(startDate);
        startDate = moment(startDate).add(1, 'days').format(format);
        }
        return dates;
    },
    getFirstDayOfCurrentMonth: (format) => {
        format = format?format: "YYYY-MM-DD";
        let ret = moment().clone().startOf('month').format(format); 
        return ret;
    }, 
    getFirstDayOfCurrentYear: (format) => {
        format = format?format: "YYYY-MM-DD";
        let ret = moment().startOf('year').format(format);
        return ret;
    },
    getPastDatesFromToday: (noOfDays, format) => {
        format = format?format: "YYYY-MM-DD";
        let today = moment().format(format);
        let firstDay = moment().subtract(6, 'days').startOf('day').format(format); 
        let days = helper.enumerateDaysBetweenDates(firstDay, today, format); 
        return days;
    },
    getMySqlWeekNumber: async (sequelize, date, inputFormat) => {
        inputFormat = inputFormat?inputFormat: 'YYYY-MM-DD';
        let qry = `select DATE_FORMAT("${date}","%U") as week_number`;
        let result = await helper.doSelectQryAsync(sequelize, qry);
        let ret = null;
        if(result.length) {
            ret = result[0].week_number;
        }
        return ret;
    },
    getMySqlMonthNumber: async (sequelize, date, inputFormat) => {
        inputFormat = inputFormat?inputFormat: 'YYYY-MM-DD';
        let qry = `select DATE_FORMAT("${date}","%c") as month_number`;
        let result = await helper.doSelectQryAsync(sequelize, qry);
        let ret = null;
        if(result.length) {
            ret = result[0].month_number;
        }
        return ret;
    },
    getMonthNameFromNumber: (monthNo) => {
        let ret = moment().month(monthNo).format('MMMM');
        console.log(`${monthNo} - ${ret}`);
        return ret;
    },
    prettifyDate: (date, outputFormat, inputFormat) => {
        var ret = date;
        if(!date) {
        return null;
        }
        outputFormat = outputFormat?outputFormat: 'DD-MM-YYYY';
        inputFormat = inputFormat?inputFormat: 'YYYY-MM-DD';
    
        var cdt = moment(date, inputFormat); 
        cdt = cdt?cdt: moment(date, 'DD-MM-YYYY');
        ret = cdt?cdt.format(outputFormat): ret;
        
        return ret;
    },
    prettifyDateTime: (dtm, outputFormat = 'DD-MM-YYYY hh:mm A', inputFormat = 'YYYY-MM-DD HH:mm:ss') => {
        var ret = dtm;
        if(!dtm) {
        return null;
        }
        outputFormat = outputFormat?outputFormat: 'DD-MM-YYYY hh:mm A';
        inputFormat = inputFormat?inputFormat: 'YYYY-MM-DD HH:mm:ss';
    
        var cdt = moment(dtm, inputFormat); 
        cdt = cdt?cdt: moment(dtm, 'DD-MM-YYYY HH:mm:ss');
        ret = cdt?cdt.format(outputFormat): ret;
        
        return ret;
    },
    formatCurrency:  (amount) => {
            const LANGUAGE_CODE = "en-US";
            const CURRENCY = "USD"; 
            return (new Intl.NumberFormat(LANGUAGE_CODE, { style: 'currency', currency: CURRENCY }).format(amount));
        },

    doSelectQry: (sequelize,qry,cb,replacements) => {   
        //console.log("Executing qry: ");
        //console.log(qry);
        var seqQry = null;
        if(!replacements ) {
            seqQry = sequelize.query(qry,{ type: sequelize.QueryTypes.SELECT });
        }else {
            //printLog("Query is: "+qry,"info");
            //printLog("Replacements are "+JSON.stringify(replacements),"info");
            seqQry = sequelize.query(qry,{replacements:replacements, type: sequelize.QueryTypes.SELECT}); 
        }
        seqQry.then(function(results) {
            //printLog("--------","info");
            //printLog("Select Query: "+qry,"info");
            //printLog("Results: "+JSON.stringify(results),"info");
        // printLog("--------","info");
            if(cb)
            cb.call(null,results);
        });
    }, 
    doSelectQryAsync: async (sequelize,qry,cb,replacements) => {   
        var seqQry = null;
        if(!replacements ) {
            seqQry = sequelize.query(qry,{ type: sequelize.QueryTypes.SELECT });
        } else { 
            seqQry = sequelize.query(qry,{replacements:replacements, type: sequelize.QueryTypes.SELECT}); 
        }
        return  seqQry; 
    },
    getTimezone: () => {
        
    }, 
    cleanArray: (values, allowedValues) => {  
        let result = [];
        for(let value of values) {
            if(allowedValues.indexOf(value) != -1) {
                result.push(value);
            } else {

                console.log(`Value ${value} not in allowed values`);
            }
        }
        return result;
    },
    cleanParams: (params, allowedParams, includeStatus = true) => { 
        var newParams = includeStatus?{status: 1}: {};
        let allowedParamsAll = allowedParams.slice();
        let operators = [
            'and', 'or', 'col', 'all',
            'eq', 'ne',
            'is', 'not',
            'gt', 'gte',
            'lt', 'lte',
            'between', 'notBetween',
            'in', 'notIn',
            'like', 'notLike',
            'startsWith', 'endsWith',
            'substring', 'iLike', 'notLike',
            'regexp', 'notRegexp',
            'iRegexp', 'notIRegexp',
            'any'

        ];
        for(let op of operators) { 
            //console.log("Operator "+op);
            allowedParamsAll.push(Sequelize.Op[op]);
        }
        //console.log(allowedParamsAll);
        var param;
        for(var key in allowedParamsAll)     { 
            param = allowedParamsAll[key];
            if(params[param] !== undefined){
                newParams[param] = params[param];
            }
        } 
        
        return newParams;
    }, 
    getIpAddress: (req) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return ip;
    },
    getUserAgent: (req) => {
    let useragent = req.get('User-Agent');;
    return useragent;
    },
    findAllCustom: async (req, res, queryString, options, settings = {}, cb = null) => {
        try {  
            const {sequelize} = options;
            let response = {
                success: true,
                items: []
            };
            let paginationInfo = null;
            const reqParams = {...req.query,...req.params};
            const paginationSettings = {...reqParams};
            let pagination  = settings.pagination?settings.pagination: paginationSettings;
            let isPaginationEnabled = pagination.enabled !== undefined? pagination.enabled: true;
            let perPage =  (pagination.per_page !== undefined) && pagination.per_page !== null && pagination.per_page !== ''?pagination.per_page: DEFAULT_PAGE_SIZE;
            isPaginationEnabled = perPage !== null? isPaginationEnabled: false;// if per_page is not sent that means pagination is not enabled
        
            if(isPaginationEnabled) {
                if(!pagination.page || !pagination.per_page)
                    pagination = reqParams;
                const page = parseInt(pagination.page?pagination.page:1);    
                const limit = parseInt(pagination.per_page?pagination.per_page:30);
                let returnPaginationInfo =  pagination.returnPaginationInfo !== undefined?pagination.returnPaginationInfo:true;
                const offset = (page - 1)*limit; 
                let baseQry = `SELECT * FROM (${queryString}) a`;
                queryString =  `${baseQry} LIMIT ${limit} OFFSET ${offset}`; 
                if(returnPaginationInfo) {
                    const countQry = `SELECT COUNT(*) AS total_count FROM (${baseQry}) count_info_data_for_find_all`;
                    console.log(`Count query is`, countQry)
                    const records = await helper.doSelectQryAsync(sequelize,countQry);
                    const totalItemsCount = records.length? records[0].count: 0;
                    const totalPagesCount = Math.ceil(totalItemsCount/limit);
                    const hasNextPage =( totalItemsCount != 0 ) && (totalPagesCount != page);
                    paginationInfo = {
                        page,
                        per_page: limit,
                        total_items_count: totalItemsCount,
                        total_pages_count: totalPagesCount,
                        has_next_page: hasNextPage
                    }; 
                }
            }  
            const items = await helper.doSelectQryAsync(sequelize, queryString);
            response.items = items;
            if(paginationInfo) 
                response.pagination = paginationInfo;
            if(res) 
                res.send(response);
            if(cb)cb(response);
        } catch(error) { 
            console.log("Error/findAllCustom", error);
            throw error;
        }
    },
    extractSortingParamsFromReqParams: (reqParams) => {
        const result = {};
        const sortKeyPrefix = `sort.`;
        for(let param in reqParams) {
            if(!param.includes(sortKeyPrefix)) continue;
            const sortBy = param.replace(sortKeyPrefix, ``);
            result[sortBy] = reqParams[param];
        }
        return result;

    },
    getAdvancedFiltersAndSortingParams: (model, conditionsPassed, availableFilters, modelAttrs) => {
        // console.log(`Conditions`, conditionsPassed);
        // console.log(`Available filters`, availableFilters);
        const selectConfig = {};
        const order = [];
        const where = {};
        let sortParams = helper.extractSortingParamsFromReqParams(conditionsPassed); 
        for(let sortBy in sortParams) {
            if(!availableFilters.includes(sortBy)) continue; 
            let sortOrder = sortParams[sortBy];
            sortOrder = sortOrder&&sortOrder.toLowerCase() == "asc"?sortOrder:"desc";
            order.push([sortBy, sortOrder.toUpperCase()]); 
        }
        if(order.length) 
            selectConfig.order = order;
        const numericOperations =  
        [
            { paramSuffix: 'min',operation: 'gte' },
            { paramSuffix: 'max', operation: 'lte' },
            { operation: 'lt' },
            { operation: 'gt' } 
        ]
        const fromUnixTime = (unixTs) => Sequelize.fn("FROM_UNIXTIME", unixTs);
        const betweenOperation = {
            operation: `between`,
            getValue: (val) => val.split(',').map((vl, index) => !index?fromUnixTime(vl):  Sequelize.literal(`DATE_ADD(FROM_UNIXTIME(${vl}), INTERVAL 1 DAY)`) ) 
        };
        const filterConfigs = {
            STRING: [{ operation: 'like', getValue: (val) => `%${val}%` }],
            INTERGER: numericOperations,
            FLOAT: numericOperations,
            DOUBLE: numericOperations,
            DATE: [betweenOperation],
            TIMESTAMP: [betweenOperation],
            DATETIME: [betweenOperation]
        }	 
        for(const ky in availableFilters) {
            fld = availableFilters[ky];
            fldType = model.tableAttributes[fld]?(typeof model.tableAttributes[fld].type!== 'string'? (model.tableAttributes[fld].type.constructor.key): model.tableAttributes[fld].type): null;
            const filterConfig = (fldType? filterConfigs[fldType]: null) || null;  
            if(!filterConfig) continue;
            filterConfig.map((config) => {
                let {paramSuffix = config.operation, operation, getValue = null} =  config; 
                const paramName = `${fld}.${paramSuffix}`;
                // console.log(`checking for param ${paramName} for filter in ${JSON.stringify(conditionsPassed)}`);
                if( paramVal = conditionsPassed[paramName]) {
                    // console.log(`Value found as ${paramVal}`);
                    where[fld] = where[fld] !== undefined? where[fld]: {};
                    where[fld][Sequelize.Op[operation]] = getValue? getValue(paramVal): paramVal;
                } else { 
                    // console.log(`Value not found`);
                }
            });
        }
        // console.log(`Select config for advanced is`, selectConfig);
        selectConfig.where = where;
        return selectConfig;
    },

    /**
     * 
            const rawAttrs = model.rawAttributes; 
            for(let filter in rawAttrs) {
                const attrData = rawAttrs[filter]; 
                availableAttributes.push(filter);
                if(attrData.type == `VIRTUAL`) continue; 
                availableFilters.push(filter); 
            }  
    */
    getRealModelAttributes: (model) => Object.keys(model.rawAttributes).filter(attr => model.rawAttributes[attr].type !== `VIRTUAL`),
    findAll: (model, req, res,settings, cb, enableStatusCheck) => {
        try {	
            settings = settings || {}; 
            settings.attributes = settings.attributes && Object.keys(settings.attributes).length>0?settings.attributes: null;
            enableStatusCheck = enableStatusCheck !== undefined?enableStatusCheck: true;
            let order = settings.order;
        
            let conditions = settings.where;
            const availableFilters = [];
            const availableAttributes = [];

            const rawAttrs = model.rawAttributes; 
            for(let filter in rawAttrs) {
                const attrData = rawAttrs[filter];  
                availableAttributes.push(filter);
                if(attrData.type == `VIRTUAL`) continue; 
                availableFilters.push(filter); 
            }  
            let attributes = availableFilters;
            if(settings.attributes) 
                attributes = helper.cleanArray(settings.attributes, availableAttributes); 
            
            const selectConfig = {attributes: attributes}; 
            order = order?order: null;
            const modelAttrs = model.rawAttributes;  
            let reqParams = {}; 
            const groupBy = settings.group?settings.group: null;
            
            if(req)
                reqParams = {...req.query,...req.params}; 
            
            let paginationSettings = {
                ...reqParams
            };

            let additionalResponse = {};
            if(settings) {
                if(settings.additionalResponse) 
                    additionalResponse = settings.additionalResponse;
                reqParams =  {...reqParams, ...settings};
            }
            settings.includeRequestBasedConditions = settings.includeRequestBasedConditions == undefined? false: settings.includeRequestBasedConditions;
            conditions = conditions? (!settings.includeRequestBasedConditions? conditions: {...reqParams, ...conditions}):reqParams;
            // console.log(`Preflight value for conditions`, conditions);
            // const {useAndOperatorForQueryFilters} = settings;
            // if(!useAndOperatorForQueryFilters)
                conditions = settings.additionalConditions? {...conditions, ...settings.additionalConditions}: conditions;
            // else { 
            // 	const {additionalConditions} = settings;
            // 	const tmp = [];
            // 	console.log(`Pushing normal conditions`);
            // 	for(let key in conditions) {
            // 		tmp.push({
            // 			[key]: conditions[key]
            // 		});
            // 	}
            // 	console.log(`TMP`, tmp);
            // 	console.log(`Pushing additional condtions`);
            // 	for(let key in additionalConditions) {
            // 		console.log(`KeyADD`, key);
            // 		tmp.push({
            // 			[key]: additionalConditions[key]
            // 		}); 
            // 	}
            // 	console.log(`TMP`, tmp);
            // 	conditions = {[Sequelize.Op.and]: tmp};
            // }

            let pagination  = settings.pagination?settings.pagination: paginationSettings;
            let isPaginationEnabled = pagination.enabled !== undefined? pagination.enabled: true;
            if(isPaginationEnabled && (!pagination.page || !pagination.per_page) ) 
                pagination = conditions;
            let page = pagination.page?pagination.page:1;    
            let perPage =  (pagination.per_page !== undefined) && pagination.per_page !== null && pagination.per_page !== ''?pagination.per_page: DEFAULT_PAGE_SIZE;
            isPaginationEnabled = perPage !== null? isPaginationEnabled: false;// if per_page is not sent that means pagination is not enabled
            let limit;
            let returnPaginationInfo = pagination.returnPaginationInfo !== undefined?pagination.returnPaginationInfo:true;
            if(isPaginationEnabled) {
                page = parseInt(page);
                perPage = parseInt(perPage);
                limit = perPage;
                if(!isNaN(limit))
                    selectConfig.limit =  perPage;  
                const offset = (page - 1)*perPage;
                if(!isNaN(offset))
                    selectConfig.offset = offset;
            } else 
                returnPaginationInfo =  false;
            
            let conditionsPassed = {...conditions}; 
            let advancedFiltersAndSorting = helper.getAdvancedFiltersAndSortingParams(model, conditionsPassed, availableFilters, modelAttrs);
            // console.log(`Advanced filters and sorting is`, advancedFiltersAndSorting);
            conditions = {...conditions, ...advancedFiltersAndSorting.where};
            delete conditions.page;//for the timebeing ignoring this filter otherwise pagination will be affected.
            conditions = helper.cleanParams(conditions, availableFilters); 
            if(enableStatusCheck) 
                conditions.status = 1; 
            else  
                delete conditions.status;  
            let include =  settings.include?settings.include:null; 
            if(order) 
                selectConfig.order = order;
            if(advancedFiltersAndSorting.order) { 
                settings.useOnlyRequestBasedSorting = settings.useOnlyRequestBasedSorting !==  undefined?settings.useOnlyRequestBasedSorting: true;
                // console.log(`Setting order as`, advancedFiltersAndSorting.order);
                selectConfig.order = settings.useOnlyRequestBasedSorting? advancedFiltersAndSorting.order:[...(selectConfig.order || []),...advancedFiltersAndSorting.order]; 
                // console.log(`Set order as`, selectConfig.order);
            }

            const {conditionsPreProcessor} = settings;
            if(conditions) {
                // console.log(`Conditions before preprocessing`, conditions);
                conditions = conditionsPreProcessor? conditionsPreProcessor(conditions): conditions;
                // console.log(`Conditions after preprocessing`, conditions);
                selectConfig.where = conditions;
            }
            
            if(include) 
                selectConfig.include = include; 
            
            if(groupBy) 
                selectConfig.group = groupBy; 
            model.findAll(selectConfig).then(function(result) {  
                let response = {
                    image_base:  settings.imageBase,
                    success: true
                };
                response.items = result?result: []; 
                
                if(additionalResponse) 
                    response = {...response, ...additionalResponse};

                response.message = null;
                const ret = (response) => {
                    if(cb) cb.call(null,response); 
                    if(res) res.send(response); 
                }
                if(returnPaginationInfo) {
                    delete selectConfig.offset; 
                    if(selectConfig.attributes) delete selectConfig.attributes;
                    model.count(selectConfig).then(function(totalItemsCount) {
                        totalItemsCount = totalItemsCount?totalItemsCount:0;
                        const totalPagesCount = Math.ceil(totalItemsCount/limit);
                        const hasNextPage =( totalItemsCount != 0 ) && (totalPagesCount != page);
                        const pagination = {
                            page: page,
                            per_page: perPage,
                            total_items_count: totalItemsCount,
                            total_pages_count: totalPagesCount,
                            has_next_page: hasNextPage
                        };
                        response.pagination = pagination;
                        ret.call(null, response);
                    });
                } else 
                    ret.call(null, response);
            }); 
        } catch(error) {
            console.log("Error/findAll", error);
            throw error;
        }
    },
    save: (model, req, res, cb, settings) => {
        let allParams = {...req.params,...req.body};
        let fn = allParams.id !== undefined?'update': 'create';
        helper[fn](model, req, res, cb, settings);
    }, 
    create: (model, req, res, cb, settings) => {
            var response;
            var reqParams = {};
            if(req)
                reqParams = {...req.query,...req.params,...req.body};
            var additionalResponse = {};
            if(settings) {
                if(settings.additionalResponse) {
                    additionalResponse = settings.additionalResponse;
                } 
                reqParams =  {...reqParams, ...settings};
            }
            
            var  availableParams = Object.keys(model.rawAttributes);
            var fieldsNValues = helper.cleanParams(reqParams, availableParams); 
            //console.log("Fields n values "+stringify(fieldsNValues));

            model.create(fieldsNValues).then(function(data) { 
                let primaryKeys = model.primaryKeys; 
                data = data?data.dataValues: {};
                let result = {success: true, message: "Successfully created the record", errors: []};
                for(let pKey in primaryKeys) {
                    result[pKey] = data[pKey];
                }

                response = {...result, ...additionalResponse};
                if(cb)
                    cb.call(null, response);
                if(res) { 
                    res.send(response);
                } 
            }).catch(function(error) {
                var result = {success:false,message:"Error while creating record", error:error, stackError:error.stack};
                console.log("Result is "+stringify(result));
                response = {...result,...additionalResponse};
                if(res) { 
                    res.status(500);
                    res.json(response);
                }
                if(cb)
                    cb.call(null, response);
            });
            
            
    },
    createAsync: async (model, req, res, settings) => {
            var response;
            var reqParams = {};
            if(req)
                reqParams = {...req.query,...req.params,...req.body};
            var additionalResponse = {};
            if(settings) {
                if(settings.additionalResponse) {
                    additionalResponse = settings.additionalResponse;
                } 
                reqParams =  {...reqParams, ...settings};
            }
            
            var  availableParams = Object.keys(model.rawAttributes);
            var fieldsNValues = helper.cleanParams(reqParams, availableParams); 
            //console.log("Fields n values "+stringify(fieldsNValues));

            let data = await model.create(fieldsNValues);
            try {
                let primaryKeys = model.primaryKeys; 
                data = data?data.dataValues: {};
                let result = {success: true, message: "Successfully created the record"};
                for(let pKey in primaryKeys) {
                    result[pKey] = data[pKey];
                }

                response = {...result, ...additionalResponse};
            
                if(res) { 
                    res.send(response);
                } 
            
            } catch(error) {
                var result = {success:false,message:"Error while creating record", error:error, stackError:error.stack};
                console.log("Result is "+stringify(result));
                response = {...result,...additionalResponse};
                if(res) { 
                    res.status(500);
                    res.json(response);
                }
                if(cb)
                    cb.call(null, response);
                
            };
            
            
    },
    update: (model, req, res, cb, settings, conditions) => {
        var reqParams = {};
        var response;
        if(req)
            reqParams = {...req.query,...req.params,...req.body};
        if(settings) 
        reqParams =  {...reqParams,...settings};
        
        //console.log("Req params are "+stringify(reqParams));
        if(!conditions) {
            if(!reqParams.id) {
                if(res) {
                    var response = {success:false,message:"No selector or id found for update. Pass id or conditions in params or settings"};
                    res.send(response);
                    if(cb)
                        return cb.call(null, response);
                }
                return false;
            }
            conditions = {id: reqParams.id};
        }
        
        var additionalResponse = {};
        
        if(settings) {
            if(settings.additionalResponse) {
                additionalResponse = settings.additionalResponse;
            } 
        }
        var  availableParams = Object.keys(model.rawAttributes);
        var fieldsNValues = helper.cleanParams(reqParams, availableParams); 
        //console.log("Going to update record");
        //console.log(stringify(fieldsNValues));
        //console.log(stringify(conditions));
        model.update(fieldsNValues, {where: conditions}).then(function(data) { 
            var result = {success: true, message: "Successfully updated the record", errors: []};
            response = {...result, ...additionalResponse};
            if(cb)
                cb.call(null, response);
            if(res) { 
                res.send(response);
            } 
        }).catch(function(error) {
            var result = {success:false,message:"Error while updating the record", error:error, stackError:error.stack};
            //console.log(stringify(result));
            response = {...result,...additionalResponse};
            if(res) {
                res.status(500); 
                res.json(response);
            }
            if(cb)
                cb.call(null, response);
        }); 
    },
    findOne: (model,req,res,settings,cb) => {   
            settings = settings?settings:{};
            var conditions = settings.where;
            var  availableFilters = Object.keys(model.rawAttributes);
            let attributes = availableFilters;
            if(settings.attributes) {
                if(Array.isArray())
                    attributes = helper.cleanArray(settings.attributes, availableFilters);
                //currently case of exclude is not handled...
            
            }
            var include =  settings.include?settings.include:null;
            
            var reqParams = {};
            if(req)
                reqParams = {...req.query,...req.params};
            
            var additionalResponse = {};
            if(settings) {
                if(settings.additionalResponse) {
                    additionalResponse = settings.additionalResponse;
                } 
                reqParams =  {...reqParams, ...settings};
            }

            if(!attributes.length) { 
                let response = {}; 
                response.success = true; 
                if(additionalResponse) {
                    response = {...response, ...additionalResponse};
                }
                if(res) {  
                    res.send(response); 
                }
                if(cb) { 
                    cb.call(null,response);
                }
                return;
            }
            conditions = conditions?conditions:reqParams;
            conditions = helper.cleanParams(conditions, availableFilters); 
            conditions.status = 1;
            var selectConfig = {attributes: attributes};
            if(include) {
                selectConfig.include = include; 
            } 
            if(conditions) {
                selectConfig.where = conditions;
            }
            model.findOne(selectConfig).then(function(result) { 
                if(result) { 
                    result = stringify(result);  
                    result = JSON.parse(result);
                }
                var response = result;
                response = response?response:{}; 
                response.success = true;
                response.image_base = settings.imageBase;
                
                if(additionalResponse) {
                    response = {...response, ...additionalResponse};
                } 
                if(cb) { 
                    cb.call(null,response);
                }
                if(res) { 
                    if(result) {  
                        res.send(response);
                    } else {
                        res.sendStatus(404);
                    }
                }
            });
        },
    findEntityById: (model, id, req, res, cb) => {
            var conditions = {id: id, status: 1};
            console.log(`finding entity by id ${id}`);
            helper.findOne(model, null, null, {where: conditions}, function(record) {
                var ret = null;
                if(record.id) {
                    ret = record;
                }
                if(cb) {
                    cb.call(null, ret);
                }
            });
        },
        findEntityByIdAsync: async (Model, id, options = {}) => {
            var conditions = {id: id, status: 1}; 
            let settings = { 
                where: conditions
            };
            settings = {...settings, ...options};
            const ret = await Model.findOne(settings).then(response => {  
                return response?response.dataValues: null;
            }). catch(err => {
                console.log("Error occured while getting monthly sum" );
                console.log(err);
            });    
            return ret;
        },
    findEntityByIdAndHandlePermissions: (req, res, id, model, cb) => {
            let config = {
            where: {
                status: 1, 
                id: id
            }
            };  
            model.findOne(config).then((result) => {  
            let isAllowed = result != null;
            if(isAllowed) {   
                result = stringify(result);  
                result = JSON.parse(result);
                isAllowed = helper.handlePermissions(req, res, result);
            }   else { 
                res.status(404).send();
            }
            cb(isAllowed, result);
        });
    },

        capitalizeFirstLetter: (string) => {
            return string.charAt(0).toUpperCase() + string.slice(1);
        },
        
    base64ToPng: (base64) => {
        const im = base64.split(",")[1];
        if(!im.length) {
        return null;
        } 
        return Buffer.from(im, 'base64');

    },
    isNumeric: (str) => {  
        if (typeof str != "string") return false // we only process strings!  
        return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
            !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
    }, 
    dynamicSort: (property) => {
        var sortOrder = 1;
        if(property[0] === "-") {
            sortOrder = -1;
            property = property.substr(1);
        }
        return function (a,b) {
            /* next line works with strings and numbers,  
            */
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        }
    },
    trimStrEllip: (str, length) => {
        let newStr =  str.length > length ? str.substring(0, length) + "..." : str;
        let ret = {
            newValue: newStr,
            newStrLen: (length-3)
        };
        return ret;
    },

    convertToSequelizeGeoPoint: (latLng) => {
        let point = null;
        if(latLng) {
            latLng = latLng.split(',');
            if(latLng.length==2){ 
                latLng[0] = parseFloat(latLng[0]);
                latLng[1] = parseFloat(latLng[1]);
                point = { type: 'Point', coordinates: latLng};
            } 
        }
        return point; 
    },
    convertObjectFieldsToPoints: (obj, fields) => {
        for(let field of fields) {
            let latLng = obj[field] || null; 
            if((latLng == undefined) || (latLng == null)) continue;
            let point = Sequelize.literal(`Point(${latLng})`);
            //helper.convertToSequelizeGeoPoint(latLng);
            if(point) {
                obj[field] = point;
            } 
        }
    },
    convertPointFieldsToString: (obj, fields) => {
        for(let field of fields) {
            let point = obj[field] || null;  
            //helper.convertToSequelizeGeoPoint(latLng);
            if(point) {
                let coordinates = point.coordinates;
                coordinates = coordinates.join(",");
                obj[field] = coordinates;
            } 
        }

    },

    sendApiError: (err, res) => {
        if(!res || res.headersSent){
            //console.log("Alredy response sent..");
            return;
        }
        res.status(400);
        res.send(err);
    },

    deleteAttributes: (obj, attrs) => {
        for (let attr of attrs) {
            delete obj[attr];
        } 
        return obj;
    },

    generateOtp: () => {
        let otp = Math.floor(1000 + Math.random() * 9000);
        return {
            otp: otp,
            validityMinutes: 5
        };
    },
    findAllEntities: async (model, settings) => {
        let ret = await model.findAll(settings).then((result) => {
            return result?JSON.parse(JSON.stringify(result)): null;
        });	 
        return ret;
    },
    findEntity: async (model, settings) => {
        try {
            let ret = await model.findOne(settings).then((result) => {
                return result?JSON.parse(JSON.stringify(result)): null;
            });	 
            return ret;
        } catch(err) {
            console.log(err);
            throw err;
        }
    },
    findEntityBySlug: async (model, slug, additionalConditions = {}, attributes = null, returnNonDeletedItemsOnly = true) => {
        const where = {slug, ...additionalConditions};
        returnNonDeletedItemsOnly? where.status = 1: null;
        const settings = {where};
        attributes? settings.attributes = attributes: null;
        return await helper.findEntity(model, settings);
    },
    updateEntities: async (model, conditions, values, includeStatus = true) => { 
        let modelAttrs = model.rawAttributes; 
        let allowedAttrs = Object.keys(modelAttrs);
        let fieldsNValues = helper.cleanParams(values, allowedAttrs, includeStatus);
        //console.log(`Conditions for updateEntities`, conditions);
        //console.log(`Values for updateEntities`, values);
        //console.log(`Cleaned params for updateEntities`, fieldsNValues);
        if(Object.keys(fieldsNValues).length != 0){
            //console.log(`Calling update`);
            const result = await model.update(fieldsNValues, {where: conditions}); 
            //console.log(`Result of update is`, result);
        } 
    },
    createEntity: async (model, values) => { 
        let modelAttrs = model.rawAttributes; 
        let allowedAttrs = Object.keys(modelAttrs);
        let fieldsNValues = helper.cleanParams(values, allowedAttrs);
        //console.log("Create entity called..");
        //console.log(fieldsNValues);
        //console.log(allowedAttrs);
        if(Object.keys(fieldsNValues).length != 0){
            let record = await model.create(fieldsNValues);
            let data = record?record.dataValues: {};
            let primaryKeys = model.primaryKeys;
            let ret = {};
            for(let pKey in primaryKeys) {
                ret[pKey] = data[pKey];
            }
            return ret; 
        }
        return null;
    },
    validatePhoneAndConvertToE164: async (req, res, methods) => {
        let params = req.body;
        let phone = params.phone;
        let countryCode = params.country_code;
        let isoCode = params.country_iso_alpha3_code;
        let errors = [];
        if(phone || countryCode) {
            if(phone && !countryCode) {
                errors.push({
                    field: "country_code",
                    actual: "country_code",
                    message: "country_code is mandatory when phone is provided",
                    type: "required" 
                });
            }
            if(phone && !isoCode) {
                errors.push({
                    field: "country_iso_alpha3_code",
                    actual: "country_iso_alpha3_code",
                    message: "country_iso_alpha3_code is mandatory when phone is provided",
                    type: "required" 
                });
            }
            if(!phone && countryCode) {
                errors.push({
                    field: "phone",
                    actual: "phone",
                    message: "phone is mandatory when country_code is provided",
                    type: "required" 
                }); 
            }
            if(phone && countryCode) { 
                countryCode =  countryCode.replace(/[^\w\s]/gi, '').replace("+","");
                req.body.country_code = countryCode;
                let isPhoneValid = await helper.isPhoneValid(countryCode, phone, methods);
                if(isPhoneValid) {
                    console.log(`Checking phone validity based on lib phone no...`) 
                    isPhoneValid = isPhoneNumberValid(countryCode, isoCode, phone)
                    console.log(`Phone validation results`, isPhoneValid)
                }
                if(!isPhoneValid) {
                    errors.push({
                        field: "phone",
                        actual: "phone",
                        message: "Invalid phone number.",
                        type: "invalid" 
                    });
                }  
            }
        } 
        
        if((!errors.length) && phone && countryCode ) {
            let phoneE164 = `+${countryCode}${phone}`;
            //req.body.phone = phoneE164; 
        }
        if(errors.length) {
            res.send({
                success: false,
                errors: errors
            });
        }
        return errors;
    },
    sendSuccessResponse: (result, req, res) => { 
        if(!res || res.headersSent){
            //console.log("Alredy response sent..");
            return;
        }
        let response = {
            success: true
        };
        if (result instanceof Array) {
            response.items = result;
            } else { 
            response = {...response, ...result};
            }
        res.send(response);
    },
    sendErrorResponse: (errors, req, res) => { //errors as , field, message
        if(res.headersSent){
            console.log("Error detected in phone validation...");
            return;
        }
        let response = {
            success: false,
            errors: errors
        }; 
        res.send(response);
    },
    loadModels: (models, methods) => {
        let ret = {};
        for(let modelFileName of models) {
            modelName = modelFileName.replace(/-/g,'_');
            let fieldName = helper.snakeCaseToPascalCase(modelName);
            let model =  methods.loadModel(modelFileName);
            ret[fieldName] = model;
        }
        return ret;
    },
    saveMapping: async (req, res, Model ) => {
        let userId = req.identity.id; 
        let params = req.body;
        let id = req.params.id;  
        if(id) { 
            let existing =  await Model.findOne({
                where: {
                    user_id: userId,
                    status: 1,
                    id: id
                }
            }); 
            if(!existing) {
                return helper.sendErrorResponse([{
                    field: 'id',
                    type: 'invalid',
                    message: 'There is no record existing with the specified id'
                }], req, res);
            }
        }
        req.body.status = 1;
        req.body.user_id = userId;
        let fn = !id?'create': 'update';
        helper[fn](Model, req, res);  
    }, 
    deleteMapping: async (req, res, Model) => {
        let params = req.params;
        let id = params.id;
        let userId = req.identity.id;
        
        let existing =  await Model.findOne({
            where: {
                user_id: userId,
                status: 1,
                id: id
            }
        }); 
        if(!existing) {
            return helper.sendErrorResponse([{
                field: 'id',
                type: 'invalid',
                message: 'There is no record existing with the specified id'
            }], req, res);
        }
        
        await Models.update({
            status: 0
        }, {where: {id: id}}); 

        helper.sendSuccessResponse({
            message: "Successfully deleted"
        },req, res);

    },
    updateMapping: async (mappingModel, itemField, ids, userId, additionalConditions = {}, additionalFieldsOnInsert = {}) => {
        console.log(`Ids initial value in updateMapping`, ids)
        ids = [...new Set(ids)]; 
        let where = { status: 1, ...additionalConditions };
        
        if(userId)	where.user_id = userId
        
        await mappingModel.update({status: 0}, { where }); 
        const values = ids.map(id => {
            const record = {
                [itemField]: id,
                status: 1,
                ...additionalFieldsOnInsert
            }
            if(userId)	record.user_id = userId
            return record
        }); 
        await mappingModel.bulkCreate(values); 
        return; 
        console.log(`Ids after removing duplicates`, ids)
        let idsToDelete = []; 
        console.log(ids);
        let idsToInsert = ids.slice();  
            
        let conditions = {
            status: 1,
            ...additionalConditions
        };
        if(userId) {
            conditions.user_id = userId;
        }
        let mapping =  await helper.findAllEntities(mappingModel,{
            where: conditions
        }); 
        for(let map of mapping) {	
            let itemId = map[itemField]; 
            let index = idsToInsert.indexOf(itemId); 
            if( index == -1) {  
                idsToDelete.push(itemId);
            } else {  
                idsToInsert.splice(index, 1);  
            }
        }  
        
        console.log(`Ids to delete are`, idsToDelete)
        if(idsToDelete.length) { 	 
            await mappingModel.update({
                status: 0
            }, {
                where: {
                    [itemField]: idsToDelete,
                    ...additionalConditions
                }
            }); 
        } 
        
        idsToInsert = [...new Set(idsToInsert)]; // to remove duplicates
        console.log(`Ids to insert are`, idsToInsert)
        if(idsToInsert.length) { 	
            let values = [];
            for(let idToInsert of idsToInsert) {
                let value = {
                    [itemField]: idToInsert,
                    status: 1,
                    ...additionalFieldsOnInsert
                };
                if(userId) {
                    value.user_id = userId;
                }
                values.push(value);
            } 
            await mappingModel.bulkCreate(values); 
        } 
    },
    getFullPhone: (countryCode, phone, countryIsoAlpha3Code = null) => {
        let result = `${countryCode}-${phone}`;
        result = countryIsoAlpha3Code? `( ${countryIsoAlpha3Code} ) ${result}`: result;
        return result;
    },
    getFullName: (firstName, middleName, lastName) => {

        let ret = [];
        if(firstName)
            ret.push(firstName);
        
        if(middleName)
            ret.push(middleName);
        
        if(lastName)
            ret.push(lastName);
        
        ret = ret.join(' '); 
        return ret;
    },
    removeNamePartsFromObj: (obj) => {
        if(!obj) return obj;
        let ret = obj;
        delete ret.first_name;
        delete ret.middle_name;
        delete ret.last_name;
        return ret;
    },
    removeNamePartsFromRecords: (records, userObjectFieldName)=> {
        let ret = [];
        for(let record of records) {
            let userObj = record[userObjectFieldName];
            if(userObj) {
                userObj = helper.removeNamePartsFromObj(userObj);
                record[userObjectFieldName] = userObj;
            }
            ret.push(record);
        }
        return ret;
    },
    getHashedValue: (data, key, alwaysSame = false) => {  
        console.log(`Key is ${key}, Data is ${data}`);
        let hash = null;
        if(!alwaysSame) {
            hash = AES.encrypt(data, key).toString(); 
        } else {
            hash = sha256(data).toString();
        }
        return hash;
    },
    httpPost: (url, params = [],  headers = {}) => {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`POST ${url} ${JSON.stringify(params)} with headers ${JSON.stringify(headers)}`);
                let http =  superagent.post(url).accept('json');
                for(let header in headers) http.set(header, headers[header]);
                http.send(params).then((res) => resolve(res)).catch(err => {reject(err)}); 
            } catch(error) {
                console.log("Error/httpPost", error);
                reject(error);
            }
        });
    },
    httpGet: (url, params = [],  headers = {}) => {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`POST ${url} ${JSON.stringify(params)} with headers ${JSON.stringify(headers)}`);
                let http =  superagent.get(url).query(params).accept('json');
                for(let header in headers) http.set(header, headers[header]);
                http.send(params).then((res) => resolve(res)).catch(err => {reject(err)}); 
            } catch(error) {
                console.log("Error/httpGet", error);
                reject(error);
            }
        });
    },
    httpPut: (url, params = [],  headers = {}) => {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`PUT ${url} ${JSON.stringify(params)} with headers ${JSON.stringify(headers)}`);
                let http =  superagent.put(url).accept('json');
                for(let header in headers) http.set(header, headers[header]);
                http.send(params).then((res) => resolve(res)).catch(err => {reject(err)}); 
            } catch(error) {
                console.log("Error/httpPost", error);
                reject(error);
            }
        });
    },
    isObject: (obj) => {
        return Object.prototype.toString.call(obj) === '[object Object]';
    },
    rejectIfInvalidParamValue: (paramName, paramValue, allowedValues, req, res) => {
        if(allowedValues.indexOf(paramValue) == -1) {
            helper.sendErrorResponse([
                {
                    field: paramName,
                    actual: paramName,
                    message: `Invalid value for '${paramName}'. Allowed values are "${allowedValues.join(', ')}"`,
                    type: "invalid" 
                }
            ],req, res); 
            return false;
        }
        return true;
    }, 

    findCount: (Model, conditions) => {
        return new Promise(async (resolve, reject) => {
            try { 
                const count =  await Model.count({
                    where: conditions
                });
                resolve(count);
            } catch(err) {
                console.log("count", err);
                reject(err);  
            }
        });
    },
    promise: (cb) => new Promise(cb),
    findOneMappingRecord: (userId, Model) => {
        return helper.findEntity(Model,{
            where: {
                status: 1,
                user_id: userId
            }
        });
    },
    findAllMappingRecords: (userId, Model) => {
        return helper.findAllEntities(Model,{
            where: {
                status: 1,
                user_id: userId
            }
        });
    },
    findMappingRecords: (userId, modelsWithKeys) => { 
        return helper.promise(async (resolve, reject) => {
            try {
                const result = {}; 
                let i = 1;
                for(let key in modelsWithKeys) {
                    console.log(`findMappingRecords: Processing record #${i++}`);
                    const mappingRecords = await helper.findAllMappingRecords(userId, modelsWithKeys[key]);
                    result[key] = mappingRecords;
                }
                resolve(result);
            } catch(err) {
                reject(err);
            }
        });
    },
    findMappings: (userId, config) => {
        /**
         * config -> [
         * 	{
         * 		model:<>,
         * 		key:<>,
         * 		isOneToOne: true,
         * 		 
         * 	}
         * ]
         */
        return helper.promise((resolve, reject) => {
            try {
                const promises = [];
                let i = 1;
                const keys = [];
                for(let item of config ) { 
                    const {key, isOneToOne, model} = item;  
                    const fn = isOneToOne? helper.findOneMappingRecord: helper.findAllMappingRecords;
                    keys.push(key);
                    promises.push(fn(userId, model));
                }
                Promise.all(promises).then((result) => {
                    let i = 0;
                    const finalResult = {};
                    let ln = result.length;
                    while(i < ln) {
                        let key = keys[i];
                        finalResult[key] = result[i];
                        i++;
                    }
                    console.log(`findMappings: finalResult: ${finalResult}`);
                    resolve(finalResult);
                }).catch(reject) ;

            } catch(err) {
                reject(err);
            }
        }); 
    },
    invertObject: (object) =>Object.entries(object).reduce((result, value) =>  ({...result, [value[1]]: value[0] }), {}),
    getFieldValuesFromArrOfObjs: (arr, field) => {
        //console.log(`Extracting ${field}s from ${JSON.stringify(arr)}`);
        const result = [];
        for(let obj of arr) 
            result.push(obj[field]);
        return result;
    },
    convertDbQueryResultToJson: (queryResult) => {
        return JSON.parse(JSON.stringify(queryResult));
    },
    disableOnlyFullGroupBy: (sequelize) => {
        console.log(`Disabling only full group by`);
        return sequelize.query(`SET sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));`);
    },
    getSequelizeConditionForCaseInsensitiveLike(field, keyword) { 
        keyword = keyword.toLowerCase();
        const {Op: {like}, where, fn, col } = Sequelize; 
        return where(fn('lower', col(field)), { [like]: `%${keyword}%` });
    },
    deepClone: (obj) => { 
        return _.cloneDeep(obj);
    },
    testRoute: (method ,route, params = []) => {
        const allowedMethods = [`GET`, `POST`]
        if(!allowedMethods.includes(method))
            return console.log(`Unable to test route ${method} ${route}. Invalid method ${method}`)
        const fn = method == `GET`? helper.httpGet: helper.httpPost
        return fn(route, params)
    },
    testServiceHealth: (module, controller) => {
        console.log(`Test service health called for module ${module} and controller ${controller}`)
        const port = process.env.SERVICE_PORT
        const route = `http://localhost:${port}/${module}/app/health-check`
        const method = `GET`
        console.log(`Checking health for controller ${controller} in module ${module} by pinging route ${method} ${route}`)
        helper.testRoute(method, route).then(result => {
            console.log(`Health check result of ${method} ${route}`, result.status)
            console.log(`Health check finished...`)
        }).catch((err) => {
            console.log(`Test health error`, err)
        })
    },
    healthCheck: (req, res) => { 
        try {
            res.send({
                success: true,
                message: `Healthcheck Successfull`,
                url: req.originalUrl
            })
        } catch(err) {
            console.log(`Error/common/app/healthCheck`, err)
        }
    }
}
module.exports = helper;