const getRawBody = require('raw-body')

module.exports = {
  toQueryString(query) {
    if (!(query instanceof Object) || Object.keys(query).length === 0) return ''
    const queryString = Object.keys(query)
      .map(key => `${key}=${query[key]}`)
      .join('&')

    return `?${queryString}`
  },
  getTimestamp(duration, unit = 'day') {
    switch (unit) {
      case 'second':
        return duration * 1000
      case 'minute':
        return duration * 60 * 1000
      case 'hour':
        return duration * 60 * 60 * 1000
      case 'day':
        return duration * 24 * 60 * 60 * 1000
    }
  },
  async toImageBase64(stream) {
    return await getRawBody(stream, 'base64')
  },
}
