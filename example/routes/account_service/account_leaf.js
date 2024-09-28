const express = require('express');
const Resource = require('@tswei/odata-resource');
const userModel = require('../../models/user');
const userController = require('../../controller/user');
const ResourceMiddleware = require('../../middleware/resource');
const bodyValidMiddleware = require('../../middleware/request_body_validator');
const router = express.Router();

var setting = {
    otype: '#ManagerAccount.v1_10_0.ManagerAccount',
    oname: 'User Account',
    rel: '/redfish/v1/AccountService/Accounts',
    node_type: 'leaf',
    model: userModel,
    okey: 'email',
    content:{
        "Description": "User Account"
    }
};

var resource = new Resource(setting);
accountLeaf = resource.initRouter(router);

var getResourceMiddleware = ResourceMiddleware.createGetResource(resource);

accountLeaf.get('/:id', getResourceMiddleware, userController.getUser);  // get user
accountLeaf.delete('/:id', getResourceMiddleware, userController.deleteUser);  // delete user
accountLeaf.patch('/', userController.editUser);  // change user password
accountLeaf.post('/', bodyValidMiddleware.user, userController.createUser);  // create user


module.exports = {
    accountLeaf,
    setting
};