const getResponseMsg = ((key) => {
    const msg = {
        "success":{
            "message": "Success."
        },
        "invalid_parameter": {
            "message": "Invalid parameters."
        },
    }
    return msg[key];
});

module.exports = {
    getResponseMsg,
};

