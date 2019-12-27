const express = require('express')
const mongoose = require('mongoose')
const downloadImages = require('./postRouter').downloadImages

const useMongoDB = global.$config.useMongoDB
const Collection = useMongoDB ? mongoose.model('Collection') : null
const collectionRouter = express.Router()
const routeName = '/collection'

collectionRouter
  .route(`${routeName}/add`)
  .get(async (req, res, next) => {
    await Collection.addCollection(req.query.name)
    next()
  })
  .post(async (req, res, next) => {
    await Collection.addCollection(req.body.name)
    next()
  })

collectionRouter
  .route(`${routeName}/remove`)
  .get(async (req, res, next) => {
    await Collection.removeCollection(req.query.name)
    next()
  })
  .post(async (req, res, next) => {
    await Collection.removeCollection(req.body.name)
    next()
  })

collectionRouter
  .route(`${routeName}/collections`)
  .get(async (req, res, next) => {
    next()
  })
  .post(async (req, res, next) => {
    next()
  })

collectionRouter
  .route(`${routeName}/like`)
  .get(async (req, res, next) => {
    await Collection.like(req.query.name, req.query.id)
    next()
  })
  .post(async (req, res, next) => {
    await Collection.like(req.body.name, req.body.id)
    next()
  })

collectionRouter
  .route(`${routeName}/dislike`)
  .get(async (req, res, next) => {
    await Collection.dislike(req.query.name, req.query.id)
    next()
  })
  .post(async (req, res, next) => {
    await Collection.dislike(req.body.name, req.body.id)
    next()
  })

collectionRouter
  .route(`${routeName}/black`)
  .get(async (req, res, next) => {
    await Collection.black(req.query.id)
    next()
  })
  .post(async (req, res, next) => {
    await Collection.black(req.body.id)
    next()
  })

collectionRouter
  .route(`${routeName}/unblack`)
  .get(async (req, res, next) => {
    await Collection.unblack(req.query.id)
    next()
  })
  .post(async (req, res, next) => {
    await Collection.unblack(req.body.id)
    next()
  })

collectionRouter.use(async (req, res) => {
  let collections = await Collection.getCollections()
  collections = await Promise.all(
    collections.map(async collection => {
      collection.posts = await downloadImages(collection.posts)
      return collection
    }),
  )
  res.json(collections)
})

module.exports = collectionRouter
