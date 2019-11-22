const express = require('express')
const api = require('../api')
const util = require('../util/util')

const postRouter = express.Router()
const routeName = '/post';

postRouter.route(routeName)
    .get(async (req, res) => {
      res.json(await api.get(`${routeName}.json${util.toQueryString(req.query)}`))
    })
    .post(async (req, res) => {
      res.json(await api.post(`${routeName}.json`, req.body))
    })

module.exports = postRouter