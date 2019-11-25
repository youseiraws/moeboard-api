module.exports = {
  port: 3000, // 端口号
  hostname: 'localhost', //主机名
  source: 'konachan', // 图片源，可选值: konachan;
  useMongoDB: true, // 是否启用MongoDB
  mongoDBUri: 'mongodb://localhost:27017/', // MongoDB地址
  // 数据时限设置
  expired: {
    enable: true, // 是否启用
    unit: 'day', // 时限单位，可选值: second;minute;hour;day
    time: 15, // 时限时长
  },
  cache: 'storage', // 图片缓存文件夹名称
}
