const superagent = require('superagent'); 
module.exports = function(config){
    var gatewayUrl = config.url; 
    if(!gatewayUrl) {
        console.log("Gateway url is not set. Set the gateway url in config/app.config.js as gateway.url");
    } else
        //console.log("Gateway url is "+gatewayUrl);
    
    return {
        get: function(path,params,callback) {
            /**
             * 
            */
            var url = gatewayUrl + path;
            console.log("Routing path "+url +" through gateway");
            superagent.get(url).query(params).end((err,res)=> { 
                callback(err,res.body);
            }); 
        },
        
        patch: function(path,params,callback) {
            /**
             * 
            */
           var url = gatewayUrl + path;
           console.log("Routing path "+url +" through gateway");
           superagent.patch(url).send(params).set('Accept', 'application/json').end((err,res)=> { 
               callback(err,res.body);
           }); 
        },
    
        getWithAuth: async function (path, params,bearer) {
            var url = gatewayUrl + path;
            
            console.log("Routing path " + url + " through gateway");
            return await superagent.get(url)
                // .query(params)
                // .set({'Content-Type': 'application/json'})
                .set({'Content-Type': 'application/json', 'authorization':  bearer})
                .then((res) => {
                    return res.text;
                })
        }
    }
}
 