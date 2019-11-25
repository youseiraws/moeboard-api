global.$config = require('./config')

const connection = require('./database/connection')
if (global.$config.useMongoDB) connection.connect()

const express = require('express')
const bodyParser = require('body-parser')
const router = require('./router')
const app = express()

app.use(bodyParser.json())
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  next()
})
app.use(router)
app.use(express.static(global.$config.cache))

app.listen(global.$config.port, global.$config.hostname)
