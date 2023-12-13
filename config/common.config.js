const obj = {
    reWriteEnvVars: () => {
        const jsonEnvVars = [`COMMON_CONFIG`, `DB_CONFIG`]
        //console.log(`Common config`, process.env.COMMON_CONFIG)
        //console.log(`DB config`, process.env.DB_CONFIG)
        const envMapping = {
            username: "DB_USER",
            password: "DB_PASS",
            host: "DB_HOST",
            port: "DB_PORT",
            dbname: "DB_NAME"
        }
        jsonEnvVars.map((envVarname) => {
            let customConfig = process.env[envVarname];
            console.log(`${envVarname} from secrets manager`, customConfig)
            customConfig = customConfig? JSON.parse(customConfig): null 
            customConfig = customConfig || {}
            let tmp = {}
            for(let key in customConfig) {
                let newKey = envMapping[key] || key
                //console.log(`${key} -> ${newKey} = ${customConfig[key]}`)
                tmp[newKey] = customConfig[key] 
            }
            //console.log(`Tmp -> `, tmp)
            process.env = {...process.env, ...tmp} 
        })
        //console.log(`All env vars`, process.env)

    }
}
export default obj