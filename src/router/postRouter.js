const fs = require('fs')
const path = require('path')
const { Readable } = require('stream')
const _ = require('lodash')
const express = require('express')
const mongoose = require('mongoose')
const api = require('../api')
const util = require('../util/util')

const cache = global.$config.cache
const useCache = global.$config.useCache
const useMongoDB = global.$config.useMongoDB
const cachePostTypes = global.$config.cachePostTypes
const Post = useMongoDB ? mongoose.model('Post') : null
const Tag = useMongoDB ? mongoose.model('Tag') : null
const postRouter = express.Router()
const routeName = '/post'
const cropType = 'crop'

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
    if (_.isEmpty(req.query.tags)) req.query.tags = 'order:random'
    else req.query.tags += ' order:random'

    const result = await api.get(
      `${routeName}.json${util.toQueryString(req.query)}`,
    )
    await _handleRequest(result, res)
  })
  .post(async (req, res) => {
    if (_.isEmpty(req.body.tags)) req.body.tags = 'order:random'
    else req.body.tags += ' order:random'

    const result = await api.post(`${routeName}.json`, req.body)
    await _handleRequest(result, res)
  })

postRouter
  .route('/cover')
  .get(async (req, res) => {
    const post = await Post.getCover(req.query.tags)
    if (post !== undefined) await _handleRequest([post], res, false)
    else {
      if (_.isEmpty(req.query.tags)) req.query.tags = 'order:random'
      else req.query.tags += ' order:random'
      req.query.limit = 1

      const result = await api.get(
        `${routeName}.json${util.toQueryString(req.query)}`,
      )
      await _handleRequest(result, res)
    }
  })
  .post(async (req, res) => {
    const post = await Post.getCover(req.body.tags)
    if (post !== undefined) await _handleRequest([post], res, false)
    else {
      if (_.isEmpty(req.body.tags)) req.body.tags = 'order:random'
      else req.body.tags += ' order:random'
      req.body.limit = 1

      const result = await api.post(`${routeName}.json`, req.body)
      await _handleRequest(result, res)
    }
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

postRouter
  .route('/cache')
  .get(async (req, res) => {
    await _handleRequest(req.query.posts, res, false)
  })
  .post(async (req, res) => {
    await _handleRequest(req.body.posts, res, false)
  })

postRouter
  .route('/crop')
  .get(async (req, res) => {
    await _saveCroppedImage(req.query, res)
  })
  .post(async (req, res) => {
    await _saveCroppedImage(req.body, res)
  })

async function _handleRequest(result, res, needCache = true) {
  if (needCache) result = await _syncTags(result)
  if (useMongoDB && needCache) await Post.insertPosts(result)
  if (useCache) result = await downloadImages(result)
  res.json(result)
}

async function _saveCroppedImage({ post, crop }, res) {
  const id = post.id
  const imageName = util.decodeImageName(post.file_url.split('/').reverse()[0])
  let cropUrl = ''
  if (useMongoDB) {
    await Post.saveImage(
      util.intoStream(new Buffer(crop, 'base64')),
      id,
      cropType,
      imageName,
    )
    cropUrl = await Post.getCacheImageUrl(id, cropType)
  } else {
    await _saveImage(
      util.intoStream(new Buffer(crop, 'base64')),
      id,
      cropType,
      imageName,
    )
    cropUrl = await _getCacheImageUrl(id, cropType, imageName)
  }
  res.json({ id, [cache]: { crop_url: cropUrl } })
}

async function _syncTags(posts) {
  return await Promise.all(
    posts.map(async post => {
      await Promise.all(
        post.tags.split(' ').map(async name => {
          let exactTag
          if (useMongoDB) exactTag = await Tag.getTag(name)
          if (_.isEmpty(exactTag)) {
            const result = await api.post(`tag.json`, { name })
            if (!_.isEmpty(result)) {
              exactTag = result.find(tag => _.isEqual(tag.name, name))
              if (useMongoDB) Tag.insertTags(result)
            }
          }
          if (!_.isEmpty(exactTag)) {
            if (post[cache] === undefined) post[cache] = {}
            if (post[cache].tags === undefined) post[cache].tags = []
            post[cache].tags.push(exactTag)
          }
        }),
      )
      return post
    }),
  )
}

async function downloadImages(posts) {
  return await Promise.all(
    posts.map(async post => {
      await Promise.all(
        [...cachePostTypes, cropType].map(async postType => {
          const cacheUrl = await _downloadImage(
            post.id,
            postType,
            post[`${postType}_url`] || post.file_url,
          )
          if (cacheUrl !== undefined) {
            if (post[cache] === undefined) post[cache] = {}
            post[cache][`${postType}_url`] = cacheUrl
            _.unset(post, [cache, postType])
          }
        }),
      )
      return post
    }),
  )
}

async function _downloadImage(id, postType, url) {
  const imageName = util.decodeImageName(url.split('/').reverse()[0])
  if (useMongoDB) {
    if (await Post.hasImageCached(id, postType))
      return await Post.getCacheImageUrl(id, postType)
    else if (postType !== cropType)
      Post.saveImage(api.download(url), id, postType, imageName)
  } else {
    if (_hasImageCached(id, postType, imageName))
      return _getCacheImageUrl(id, postType, imageName)
    else if (postType !== cropType)
      _saveImage(api.download(url), id, postType, imageName)
  }
}

function _hasImageCached(id, postType, imageName) {
  return fs.existsSync(path.resolve(cache, id.toString(), postType, imageName))
}

function _getCacheImageUrl(id, postType, imageName) {
  const imageUrl = [id.toString(), postType, imageName].join('/')
  return `http://${global.$config.hostname}:${global.$config.port}/${imageUrl}`
}

function _saveImage(imageStream, id, postType, imageName) {
  return new Promise(resolve => {
    const filePath = path.resolve(cache, id.toString(), postType)
    const fileName = path.resolve(filePath, imageName)
    if (!fs.existsSync(filePath)) fs.mkdirSync(filePath, { recursive: true })
    const cacheStream = fs.createWriteStream(fileName)
    imageStream.pipe(cacheStream)
    cacheStream.on('close', () => resolve())
  })
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

module.exports = {
  postRouter,
  downloadImages,
}
