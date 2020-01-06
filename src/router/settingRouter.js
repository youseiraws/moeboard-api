const express = require('express')
const mongoose = require('mongoose')

const useMongoDB = global.$config.useMongoDB
const Setting = useMongoDB ? mongoose.model('Setting') : null
const settingRouter = express.Router()
const routeName = '/setting'

settingRouter
  .route(`${routeName}/update`)
  .get(async (req, res, next) => {
    await Setting.updateSetting(req.query.name, req.query.value)
    next()
  })
  .post(async (req, res, next) => {
    await Setting.updateSetting(req.body.name, req.body.value)
    next()
  })

settingRouter
  .route(`${routeName}/list`)
  .get(async (req, res, next) => {
    next()
  })
  .post(async (req, res, next) => {
    next()
  })

settingRouter.route(`${routeName}/*`).all(async (req, res) => {
  res.json(await Setting.getSettings())
})

module.exports = settingRouter
