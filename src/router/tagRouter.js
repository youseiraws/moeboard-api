const express = require('express')
const mongoose = require('mongoose')
const cheerio = require('cheerio')
const api = require('../api')
const util = require('../util/util')

const useMongoDB = global.$config.useMongoDB
const Tag = useMongoDB ? mongoose.model('Tag') : null
const tagRouter = express.Router()
const routeName = '/tag'

tagRouter
  .route(routeName)
  .get(async (req, res) => {
    if (req.query.page === undefined) {
      const result = await api.get(
        `${routeName}.json${util.toQueryString(req.query)}`,
      )
      _handleRequest(result, res, false)
    } else {
      const result = await api.get(
        `${routeName}${util.toQueryString(req.query)}`,
      )
      _handleRequest(result, res)
    }
  })
  .post(async (req, res) => {
    if (req.body.page === undefined) {
      const result = await api.post(`${routeName}.json`, req.body)
      _handleRequest(result, res, false)
    } else {
      const result = await api.get(
        `${routeName}${util.toQueryString(req.body)}`,
      )
      _handleRequest(result, res)
    }
  })

function _handleRequest(result, res, hasPageProperty = true) {
  if (hasPageProperty) {
    const $ = cheerio.load(result)
    result = $('table.highlightable>tbody>tr')
      .map((i, el) => {
        const tds = $(el).children('td')
        return {
          id: parseInt(
            tds
              .eq(3)
              .children()
              .eq(0)
              .attr('href')
              .split('/')
              .reverse()[0],
          ),
          name: tds
            .eq(1)
            .children()
            .eq(1)
            .text(),
          count: parseInt(tds.eq(0).text()),
          type: util.tagTypeToInt(
            tds
              .eq(2)
              .text()
              .split(',')[0],
          ),
        }
      })
      .get()
  }
  res.json(result)
  if (useMongoDB) Tag.insertTags(result)
}

module.exports = tagRouter
