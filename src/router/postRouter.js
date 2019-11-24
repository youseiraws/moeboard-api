const express = require('express')
const mongoose = require('mongoose')
const api = require('../api')
const util = require('../util/util')

const Post = mongoose.model('Post')
const postRouter = express.Router()
const routeName = '/post'

postRouter
  .route(routeName)
  .get(async (req, res) => {
    const result = await api.get(
      `${routeName}.json${util.toQueryString(req.query)}`,
    )
    res.json(await Post.synchronizePosts(result))
    _downloadImages(result)
  })
  .post(async (req, res) => {
    res.json(await api.post(`${routeName}.json`, req.body))
  })

function _downloadImages(posts) {
  posts.forEach(async post => {
    await _downloadImage(post.id, 'preview', post.preview_url)
    await _downloadImage(post.id, 'sample', post.sample_url)
    await _downloadImage(post.id, 'jpeg', post.jpeg_url)
    await _downloadImage(post.id, 'file', post.file_url)
  })
}

async function _downloadImage(id, postType, url) {
  if (!(await Post.hasImageDownloaded(id, postType)))
    Post.saveImage(api.download(url), id, postType, url.split('/').reverse()[0])
}

module.exports = postRouter
