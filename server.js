const app = require('express')()
const bodyParser = require('body-parser')
const connection = require('./src/database/connection')
const router = require('./src/router')
const config = require('./config')

connection.connect()

app.use(bodyParser.json())
app.use(router)

app.listen(config.port, config.hostname)
