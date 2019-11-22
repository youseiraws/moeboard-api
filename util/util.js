module.exports = {
  toQueryString(query) {
    if (!(query instanceof Object) || Object.keys(query).length === 0) return ''
    const queryString = Object.keys(query).map(key => `${key}=${query[key]}`).join('&')
    return `?${queryString}`
  }
}