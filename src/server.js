global.$config = require('./config')

const connection = require('./database/connection')
if (global.$config.useMongoDB) connection.connect()

const express = require('express')
const bodyParser = require('body-parser')
const router = require('./router')
const app = express()

app.use(bodyParser.json({ limit: '50mb' }))
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Credentials', true)
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Content-Length, X-Requested-With',
  )
  res.header('Access-Control-Allow-Methods', '*')
  next()
})
app.use(router)
app.use(express.static(global.$config.cache))

app.listen(global.$config.port, global.$config.hostname)
