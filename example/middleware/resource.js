function createGetResource(resource) {
    return function getResource(req, res, next) {
        req.resource = resource
        next();
    };
}

module.exports = {
    createGetResource
};