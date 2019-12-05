const fs = require('fs')
const path = require('path')
const express = require('express')
const mongoose = require('mongoose')
const api = require('../api')
const util = require('../util/util')

const cache = global.$config.cache
const useCache = global.$config.useCache
const useMongoDB = global.$config.useMongoDB
const cachePostTypes = global.$config.cachePostTypes
const Post = useMongoDB ? mongoose.model('Post') : null
const postRouter = express.Router()
const routeName = '/post'

postRouter
  .route(routeName)
  .get(async (req, res) => {
    const result = await api.get(
      `${routeName}.json${util.toQueryString(req.query)}`,
    )
    await _handleRequest(result, res)
  })
  .post(async (req, res) => {
    const result = await api.post(`${routeName}.json`, req.body)
    await _handleRequest(result, res)
  })

postRouter
  .route('/random')
  .get(async (req, res) => {
    if (req.query.tags === undefined || req.query.tags.length === 0) {
      req.query.tags = 'order:random'
    } else {
      req.query.tags += ' order:random'
    }
    const result = await api.get(
      `${routeName}.json${util.toQueryString(req.query)}`,
    )
    await _handleRequest(result, res)
  })
  .post(async (req, res) => {
    if (req.body.tags === undefined || req.body.tags.length === 0) {
      req.body.tags = 'order:random'
    } else {
      req.body.tags += ' order:random'
    }
    const result = await api.post(`${routeName}.json`, req.body)
    await _handleRequest(result, res)
  })

postRouter
  .route('/popular')
  .get(async (req, res) => {
    const url = _popularTypeToUrl(req.query.type)
    delete req.query.type
    const result = await api.get(`${url}${util.toQueryString(req.query)}`)
    await _handleRequest(result, res)
  })
  .post(async (req, res) => {
    const url = _popularTypeToUrl(req.body.type)
    delete req.body.type
    const result = await api.post(url, req.body)
    await _handleRequest(result, res)
  })

async function _handleRequest(result, res) {
  let posts = Object.assign({}, result)
  if (useCache) posts = await _downloadImages(result)
  res.json(posts)
  if (useMongoDB) Post.insertPosts(result)
}

async function _downloadImages(posts) {
  return await Promise.all(
    posts.map(async post => {
      await Promise.all(
        cachePostTypes.map(async postType => {
          const cacheUrl = await _downloadImage(
            post.id,
            postType,
            post[`${postType}_url`],
            post[cache],
          )
          if (cacheUrl !== undefined) {
            if (post[cache] === undefined) post[cache] = {}
            post[cache][`${postType}_url`] = cacheUrl
          }
        }),
      )
      return post
    }),
  )
}

async function _downloadImage(id, postType, url) {
  const imageName = decodeURI(url.split('/').reverse()[0]).replace(
    /%5C|%2F|%3A|%2A|%3F|%22|%3C|%3E|%7C/g,
    '',
  )
  if (useMongoDB) {
    if (await Post.hasImageDownloaded(id, postType)) {
      return await Post.getCacheImageUrl(id, postType)
    } else Post.saveImage(api.download(url), id, postType, imageName)
  } else {
    if (_hasImageDownloaded(id, postType, imageName)) {
      return _getCacheImageUrl(id, postType, imageName)
    } else _saveImage(api.download(url), id, postType, imageName)
  }
}

function _hasImageDownloaded(id, postType, imageName) {
  return fs.existsSync(path.resolve(cache, id.toString(), postType, imageName))
}

function _getCacheImageUrl(id, postType, imageName) {
  const imageUrl = [id.toString(), postType, imageName].join('/')
  return `http://${global.$config.hostname}:${global.$config.port}/${imageUrl}`
}

async function _saveImage(imageStream, id, postType, imageName) {
  const filePath = path.resolve(cache, id.toString(), postType)
  const fileName = path.resolve(filePath, imageName)
  if (!fs.existsSync(filePath)) fs.mkdirSync(filePath, { recursive: true })
  imageStream.pipe(fs.createWriteStream(fileName))
}

function _popularTypeToUrl(type) {
  switch (type) {
    case 'day':
      return '/post/popular_by_day.json'
    case 'week':
      return '/post/popular_by_week.json'
    case 'month':
      return '/post/popular_by_month.json'
    default:
      return '/post/popular_by_day.json'
  }
}

module.exports = postRouter
