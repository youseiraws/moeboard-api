const app = require('express')()
const bodyParser = require('body-parser')
const router = require('./router')

app.use(bodyParser.json())
app.use(router)

app.listen(3000)


