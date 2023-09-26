const express = require('express');
const Resource = require('@tswei/odata-resource');
const userModel = require('../../models/user');
const router = express.Router();

var setting = {
    otype: '#ManagerAccountCollection.ManagerAccountCollection',
    oname: 'Accounts Collection',
    rel: '/redfish/v1/AccountService/Accounts',
    node_type: 'internal_db',
    model: userModel,
    okey: 'email',
    content:{
        "Description":"NMC User Accounts"
    }
};

var resource = new Resource(setting);
account = resource.initRouter(router);

module.exports = {
    account,
    setting
};