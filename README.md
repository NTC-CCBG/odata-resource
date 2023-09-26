# Redfish odata-resource

Node.Js module to allow for creation of REST resources served up via [ExpressJS](expressjs.com) and persisting data via [Mongoose](mongoosejs.com) that:

- Supports [OData](http://www.odata.org/) query arguments like; `$filter`, `$orderby`, `$select`, `$expand`, `$top` and `$skip`.
- Supports simple, resource definitions requiring minimal code.
- Supports static and instance based relationships between entities.
- Allows for Mongoose models to be defined and used independent of the resource implementation.
- Allows for a high degree of customization/over-riding of default behavior.

<!-- # Requirements

If exposing resources that support create (POST) and update (PUT) then your Express app must be able to parse JSON as input and you should use [body-parser](https://github.com/expressjs/body-parser) to get that done.

```
var app = require('express')();

app.use(require('body-parser').json());
``` -->

# Limitations

The `$filter` implementation is not entirely complete and is only `odata`'ish in nature.  Support for all operators is not complete.  Two non-odata operators `in` and `notin` have been implemented.  What is implemented:

## Logical Operators
- `eq` - Equal. E.g. `/redfish/v1/AccountService/Accounts?$filter=email eq 'root@its.root'`
- `ne` - Not equal. E.g. `/redfish/v1/AccountService/Accounts?$filter=email ne 'root@its.root'`
- `lt` - Less than. E.g. `/redfish/v1/AccountService/Accounts?$filter=pages lt 200`
- `le` - Less than or equal. E.g. `/redfish/v1/AccountService/Accounts?$filter=pages le 200`
- `gt` - Greater than. E.g. `/redfish/v1/AccountService/Accounts?$filter=pages gt 200`
- `le` - Greater than or equal. E.g. `/redfish/v1/AccountService/Accounts?$filter=pages ge 200`
- `and` - Logical and. E.g. `/redfish/v1/AccountService/Accounts?$filter=pages ge 200 and pages le 400`
- `or` - Logical and. E.g. `/redfish/v1/AccountService/Accounts?$filter=email eq 'userdev@test.email' or email eq 'root@its.root'`

## Functions
- `startswith` E.g. `/redfish/v1/AccountService/Accounts?$filter=startswith(email,'root')`
- `endswith` E.g. `/redfish/v1/AccountService/Accounts?$filter=endswith(email,'mail')`
- `contains` E.g. `/redfish/v1/AccountService/Accounts?$filter=contains(email,'test')`

## Non-Odata
- `in` E.g. `/redfish/v1/AccountService/Accounts?$filter=in(email,'Action','Drama')`
- `notin` E.g. `/redfish/v1/AccountService/Accounts?$filter=notin(email,'Action','Drama')`

Parenthesis can be used in `$filter` to group logical conditions.  You just cannot mix `and` and `or` within a single sub-expression (set of parenthesis).

Examples:
`/redfish/v1/AccountService/Accounts?$filter=(email eq 'root@its.root' or email eq 'test@test.email') and pages lt 500`
`/redfish/v1/AccountService/Accounts?$filter=(email eq 'root@its.root' or email eq 'test@test.email') and (contains(email,'mail') or contains(email,'test'))`

_Case Sensitivity:_ Due to the performance implications on large collections all string related filtering is unadulterated meaning it's case sensitive.  For the time being if you need case insensitive filtering you may need to consider a solution like storing a lower case version of the property you wish to perform such filtering on.

# Page structure

This package is split into four different structures for redfish. Its design comes from [binary tree](https://en.wikipedia.org/wiki/Binary_tree).

## root

The Root Node is the starting point in a tree-like structure or graph, much like the homepage of Redfish at /redfish/v1/. It displays links to various pages.

#### redfish_v1.js

```
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
```

#### Output :

```
{
    "@odata.id": "/redfish/v1",
    "@odata.type": "#redfish_test_server",
    "Id": "RootService",
    "RedfishVersion": "1.9.0",
    "Name": "Root Service",
    "AccountService": {
        "@odata.id": "/redfish/v1/AccountService"
    },
    "Links": {
        "Sessions": {
            "@odata.id": "/redfish/v1/SessionService/Sessions"
        }
    }
}
```


## internal

The Internal Node is a node in a tree structure that lies between the root node and the leaf nodes. It is akin to the /redfish/v1/AccountService in Redfish, which provides static data and lists links to other nodes.

#### account_service.js

```
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
```

#### Output :

```
{
    "@odata.id": "/redfish/v1/AccountService",
    "@odata.type": "#AccountService.v1_10_0.AccountService",
    "Id": "AccountService",
    "Description": "Account Service",
    "Status": {
        "State": "Enabled",
        "Health": "OK"
    },
    "ServiceEnabled": true,
    "MaxPasswordLength": 20,
    "MinPasswordLength": 8,
    "AuthFailureLoggingThreshold": 0,
    "Accounts": {
        "@odata.id": "/redfish/v1/AccountService/Accounts"
    },
    "Name": "Account Service"
}
```

## internal_db

The Internal DB Node differs from the Internal Node in that it presents the data of a database in a list format. It is used for pages like /redfish/v1/AccountService/Accounts, where it lists links to all the accounts.

#### account.js

```
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
```

#### Output :

```
{
    "@odata.id": "/redfish/v1/AccountService/Accounts",
    "@odata.type": "#ManagerAccountCollection.ManagerAccountCollection",
    "Members": [
        {
            "@odata.id": "/redfish/v1/AccountService/Accounts/root@its.root"
        },
        {
            "@odata.id": "/redfish/v1/AccountService/Accounts/test@test.email"
        },
        {
            "@odata.id": "/redfish/v1/AccountService/Accounts/userdev@test.email"
        },
        {
            "@odata.id": "/redfish/v1/AccountService/Accounts/testUser@test.email"
        }
    ],
    "Members@odata.count": 4,
    "Name": "Accounts Collection",
    "Description": "NMC User Accounts"
}
```

## leaf

The Leaf Node is the bottom-most node in a tree structure, and it does not have any child nodes. In this package, it is used for pages like /redfish/v1/AccountService/Accounts/{email}, where data retrieved from the database is displayed based on specific fields.

#### account_leaf.js

```
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
```

#### Output :

```
{
    "_id": "60c1d32353993811c08488bf",
    "email": "root@its.root",
    "password": "$2b$10$xGX0JJNNQQaq5hmnedqT.OjRnzsmJFoKF.3QEJfvlVCg5owZr7U1a",
    "Description": "User Account",
    "@odata.type": "#ManagerAccount.v1_10_0.ManagerAccount",
    "Name": "User Account",
    "@odata.id": "/redfish/v1/AccountService/Accounts/root@its.root",
    "Enabled": true,
    "Locked": false
}
```

# Members@odata.count

An implicit relationship `Members@odata.count` (similar to the odata `$count`) has been added that will return the integer count of a resource when listed or traversed from another entity relationship.

**Important:** `Members@odata.count` will be automatically applied to internal_db.

# Testing

```
cd example

npm install

node app.js
```
go to browser and enter the URL : 
[127.0.0.1:3000/redfish/v1](http://127.0.0.1:3000/redfish/v1)