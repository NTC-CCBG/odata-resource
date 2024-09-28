const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.HOSTPORT || 3000;
const hostname = process.env.HOSTNAME || 'localhost';
const cors_maxage = process.env.MAXAGE || 300;

// db 
const mongoose = require('mongoose');
const db_host = process.env.DB_HOST || 'localhost';
const db_port = process.env.DB_PORT || 27017;
const db_name = process.env.DB_NAME || 'example';

mongoose.connect(
    `mongodb://${db_host}:${db_port}/${db_name}`, 
    {useNewUrlParser: true, useUnifiedTopology: true}
).then(() => {
    console.log('DB connected');
  }
).catch((e) => {
    console.log(e);
});

const redfish_v1 = require('./routes/redfish_v1');

// account_service
const accountservice = require('./routes/account_service/account_service');
const account = require('./routes/account_service/account');
const accountleaf = require('./routes/account_service/account_leaf');

// Get database connection status
mongoose.connection.on('error', err => {
    console.log('DB connection error: ' + err.message);
});
mongoose.Promise = global.Promise;

app.use(redfish_v1.setting.rel, redfish_v1.root_page);

app.use(accountservice.setting.rel, accountservice.accountService);
app.use(account.setting.rel, account.account);
app.use(accountleaf.setting.rel, accountleaf.accountLeaf);

const server = app.listen(port, () => {
    console.log(`Example app listening at http://${hostname}:${port}`)
});