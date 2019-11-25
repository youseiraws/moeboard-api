global.$config = require('./config')
const app = require('express')()

const connection = require('./src/database/connection')
if (global.$config.useMongoDB) connection.connect()

const bodyParser = require('body-parser')
app.use(bodyParser.json())

const router = require('./src/router')
app.use(router)

app.listen(global.$config.port, global.$config.hostname)
