export default {
  get (that, url) {
    that.$http.get(url)
    .then(res => {
      if (res.status == 200 && res.body.status == 0) {
        that.$message({
          message: '成功',
          type: 'success'
        });
      } else {
        that.$message({
          message: res.body.stderr || res.statusText,
          type: 'error'
        });
      }
    })
    .catch( e => {
      console.log(e);
    })
  }
}