const express = require('express');
const Resource = require('@tswei/odata-resource');
const router = express.Router();

var setting = {
    otype: '#AccountService.v1_10_0.AccountService',
    oname: 'Account Service',
    rel: '/redfish/v1/AccountService',
    node_type: 'internal',
    content:{
        "Id":"AccountService",
        "Description":"Account Service",
        "Status": {
            "State":"Enabled",
            "Health":"OK"
        } ,
        "ServiceEnabled":true,
        "MaxPasswordLength": 20,
        "MinPasswordLength": 8,
        "AuthFailureLoggingThreshold": 0,
        "Accounts":{
            "@odata.id": "/redfish/v1/AccountService/Accounts"
        },
        "ServiceEnabled": true
    }
};

var resource = new Resource(setting);
accountService = resource.initRouter(router);

module.exports = {
    accountService,
    setting
};