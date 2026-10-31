import http from './http.js'

export default {
  async get(that, url, message = '成功') {
    try {
      const response = await http.get(url)
      if (Number(response.body.status) !== 0) {
        throw new Error(response.body.stderr || response.statusText || '操作失败')
      }
      that.$message({ message, type: 'success' })
      return true
    } catch (error) {
      that.$message({ message: error.message || '请求失败', type: 'error' })
      return false
    }
  }
}
