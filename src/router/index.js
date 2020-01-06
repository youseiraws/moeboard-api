const postRouter = require('./postRouter').postRouter
const tagRouter = require('./tagRouter')
const collectionRouter = require('./collectionRouter')
const settingRouter = require('./settingRouter')

module.exports = [postRouter, tagRouter, collectionRouter, settingRouter]
