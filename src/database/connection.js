const mongoose = require('mongoose')
const Grid = require('gridfs-stream')

exports.connect = function(source = global.$config.source) {
  mongoose.connect(`${global.$config.mongoDBUri}${source}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  const conn = mongoose.connection
  conn.once('open', () => (global.$gfs = Grid(conn.db, mongoose.mongo)))

  module.exports = {
    postSchema: require('./schema/postSchema'),
    tagSchema: require('./schema/tagSchema'),
    collectionSchema: require('./schema/collectionSchema'),
    settingSchema: require('./schema/settingSchema'),
  }

  const Collection = mongoose.model('Collection')
  Collection.addCollection('默认收藏集')
  Collection.addCollection('黑名单')
  Collection.addCollection('标签管理')
}
