const mongoose = require('mongoose')

const favoriteSchema = new mongoose.Schema(
  {
    name: String,
    posts: Array,
    oprerate_time: Number,
  },
  { id: false },
)

favoriteSchema.statics = {
  async insertFavorite(name) {
    if (!(await this.isFavoriteExists(name)))
      await this.create({
        name,
        posts: [],
        oprerate_time: Date.now(),
      })
  },
  async removeFavorite(name) {
    await this.remove({ name })
  },
  async isFavoriteExists(name) {
    return await this.exists({ name })
  },
  async getFavorites() {
    return await this.find()
  },
}

mongoose.model('Favorite', favoriteSchema, 'favorites')
