const axios = require('axios');

class Http {
  constructor(baseURL, timeout = 6000) {
    this.baseURL = baseURL
    this.timeout = 6000
    this._init()
  }
  
  _init() {
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {'content-type': 'application/json; charset=utf-8'}
    })
    
    this.http.interceptors.response.use(res => res.data)
  }
  
  async get(url, params) {
    return await this.http.get(url, {params})
  }
  
  async post(url, data) {
    return await this.http.post(url, data)
  }
}

module.exports = Http;