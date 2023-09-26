const express = require('express');
const Resource = require('@tswei/odata-resource');
const trunkModel = require('../models/trunk');
const linksModel = require('../models/links');
const router = express.Router();

var setting = {
    otype: '#redfish_test_server',
    oname: 'Root Service',
    rel: '/redfish/v1',
    node_type: 'root'
};

var resource = new Resource(setting);
root_page = resource.initRouter(router);

root_page.get('/', (req, res) => {
    console.log(req.query)
    
    const main_nodes = trunkModel.getService();
    const links = linksModel.getLink();
    var response = {
        "@odata.id": resource.getRel(),
        "@odata.type": resource.getOType(),
        "Id": "RootService",
        "RedfishVersion": "1.9.0",
        "Name": "Root Service"
    };

    main_nodes.forEach(function(value){
        response[value] = {"@odata.id": "/redfish/v1/" + value}
    });
    response['Links'] = {}
    Object.keys(links).forEach(function(key) {
        var value = links[key];
        response['Links'][key] = {"@odata.id": "/redfish/v1/" + value}
    });
    return res.json(response);
});

module.exports = {
    root_page,
    setting
};