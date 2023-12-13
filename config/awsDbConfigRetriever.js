import { createRequire } from "module";
const require = createRequire(import.meta.url);
const AWS = require('aws-sdk');
let accessKeyId = process.env. AWS_ACCESS_KEY_ID;
let secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
let region = process.env.AWS_REGION;
if(!accessKeyId) {
    console.log("Environment variable AWS_ACCESS_KEY_ID is not set. Exiting");
    process.exit(0);

}
if(!secretAccessKey) {
    console.log("Environment variable AWS_SECRET_ACCESS_KEY is not set. Exiting");
    process.exit(0);

}
if(!region) {
    console.log("Environment variable AWS_REGION is not set. Exiting");
    process.exit(0);
}
AWS.config.update({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: region    
}); // for simplicity. In prod, use loadConfigFromFile, or env variables

const fn =  {
    retrieve: (secretName, cb) => {
        console.log("Retrieving secret...");
        let decodedBinarySecret = null;
        let awsClient = new AWS.SecretsManager();

        let secretValue = awsClient.getSecretValue({SecretId: secretName}, function(err, data) {
            let dbConfig = null;
            if (err) { 
                console.log(`AWS secret retrieval failed with code "${err.code}". Exiting...`);
                    throw err;
                    process.exit(0);
            } else {
                let secretStr = null;
            // Decrypts secret using the associated KMS CMK.
                // Depending on whether the secret is a string or binary, one of these fields will be populated.
                if ('SecretString' in data) {
                    secretStr = data.SecretString;
                }  
                if(secretStr){ 
                    let secretObj = JSON.parse(secretStr);
                    if(!secretObj) {
                        console.log("AWS secret is retrieved. But it is not a valid key value pair. Exiting");
                        process.exit(0);
                    }
                    let config = {};
                    let configMapping = {
                        database: 'DBNAME',
                        username: 'DBUSER',
                        password: 'DBPASS', 
                        host: 'DBHOST',
                        port: 'DBPORT',
                        logging: 'LOGSENABLED',
                    }
                    
                    for(let key in configMapping) {
                        let mappedKey = configMapping[key];
                        config[key] = secretObj[mappedKey];
                        if(!config[key]) {
                            console.log(`THE SECRET NAMED "${mappedKey}" is not set. Exiting`);
                            process.exit(0);
                        }
                    }
                    config.logging = config.logging || 'FALSE';
                    config.logging =  config.logging.toLowerCase();
                    config.logging = config.logging == 'true'?console.log: false;
                    
                    config = { 
                        ...config,
                        dialect: 'mysql',
                        pool: {
                            max: 9,
                            min: 0,
                            idle: 10000
                        }
                    };
                    dbConfig =  config;
                    dbConfig.logging =  console.log;//always enable for now..
                    
                } else { 
                    console.log("AWS secret is retrieved. But it does not contain the DB credentials. Exiting");
                    process.exit(0);
                }
            } 
            if(!dbConfig) {
                console.log(`Database config is not set in the AWS secrets for the secret name ${secretName}`); 
                process.exit(0);
            }
            cb(dbConfig);  
        });
        }

    };

export default fn