const mongoose = require('mongoose')

const Post = mongoose.model('Post')

const collectionSchema = new mongoose.Schema(
  {
    name: String,
    posts: Array,
  },
  { id: false },
)

collectionSchema.statics = {
  async addCollection(name) {
    if (!(await this.isCollectionExists(name)))
      return await this.create({
        name,
        posts: [],
      })
  },
  async editCollection(oldName, newName) {
    const collection = await this.findOne({ name: oldName })
    if (collection === null) return
    collection.name = newName
    await collection.save()
  },
  async removeCollection(name) {
    await this.deleteOne({ name })
  },
  async isCollectionExists(name) {
    return await this.exists({ name })
  },
  async getCollections() {
    const collections = await this.find()
    return await Promise.all(
      collections.map(async collection => {
        await Promise.all(
          collection.posts.map(async (id, index, arr) => {
            const post = await Post.findOne({ id })
            if (post !== null) arr.splice(index, 1, post.toObject())
          }),
        )
        return collection
      }),
    )
  },
  async like(name, id) {
    const collection = await this.findOne({ name })
    if (collection === null) return
    if (collection.posts.includes(parseInt(id))) return
    collection.posts.push(parseInt(id))
    await collection.save()
  },
  async dislike(name, id) {
    const collection = await this.findOne({ name })
    if (collection === null) return
    collection.posts = collection.posts.filter(post => post !== parseInt(id))
    await collection.save()
  },
  async black(id) {
    let collection = await this.findOne({ name: '黑名单' })
    if (collection === null) collection = await this.addCollection('黑名单')
    if (collection.posts.includes(parseInt(id))) return
    collection.posts.push(parseInt(id))
    await collection.save()
  },
  async unblack(id) {
    let collection = await this.findOne({ name: '黑名单' })
    if (collection === null) collection = await this.addCollection('黑名单')
    collection.posts = collection.posts.filter(post => post !== parseInt(id))
    await collection.save()
  },
}

mongoose.model('Collection', collectionSchema, 'collections')
