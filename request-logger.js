const fn = (app) => {
    
    // Middleware to log request and response information
    app.use((req, res, next) => {
        // Store the original response.send function
        const originalSend = res.send;

        // Create an object to store response data
        const responseData = {
            statusCode: null,
            data: null,
        };

        // Override response.send to capture response data
        res.send = function(data) {
                
            const requestInfo = { 
                method: req.method,
                url: req.url,
                queryParams: JSON.stringify(req.query),
                pathParams: JSON.stringify(req.params),
                bodyParams: JSON.stringify(req.body),
                headers: JSON.stringify(req.headers),
            };

            responseData.statusCode = res.statusCode;
            responseData.data = JSON.stringify(data);
            originalSend.apply(res, arguments);
            console.log(`API CALL DETAILS`,JSON.stringify({
                ...requestInfo,
                response: responseData
            }))
        };

        // Attach the responseData object to the response object
        res.responseData = responseData;

        // Execute the next middleware or route handler
        next();
    });
}
export default fn