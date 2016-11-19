const fs = require('fs')

// 检查文件\目录是否可访问
exports.access = (path) => {
  try {
    fs.accessSync(path, fs.F_OK)
    return true
  } catch (e) {
    return false
  }
}