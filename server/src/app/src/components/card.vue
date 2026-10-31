<template>
  <el-row v-loading="loading.show" :element-loading-text="loading.text" class="cards">
    <el-col :xs="20" :sm="10" :md="6" :lg="4" v-for="o in modules" :key="o.name">
      <el-card :body-style="{ padding: '0px' }">
        <div class="box">
          <span v-if="o.local !== false" class="tag">本地</span>
          <a :href="safeUrl(o.demo)" target="_blank" rel="noopener noreferrer">
            <img :src="safeUrl(o.screenShot) || placeholder" :alt="o.name" class="image">
          </a>
          <div style="padding: 14px;">
            <div class="info clearfix description">
              <el-tooltip placement="top">
                <template #content>{{ o.description }}</template>
                <span>{{ o.description }}</span>
              </el-tooltip>
            </div>
            <div class="info clearfix">
              <span class="name">{{ o.name }}@{{ o.version }}</span>
              <span class="author">{{ authorName(o.author) }}</span>
            </div>
            <div class="bottom clearfix">
              <template v-if="o.local !== false">
                <el-button text class="button" :disabled="loading.show" @click="openPublish(o)">发布</el-button>
                <el-button text class="button" :disabled="loading.show" @click="openCopy(o)">复制</el-button>
                <el-button text class="button" :disabled="loading.show" @click="dev(o.name)">开发</el-button>
              </template>
              <el-button v-else text class="button" :disabled="loading.show" @click="install(o.name)">安装</el-button>
              <el-button v-if="safeUrl(o.release_url)" text class="button" @click="open(o.release_url)">线上</el-button>
            </div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-dialog :title="dialog.title" v-model="dialog.show" :close-on-click-modal="!dialog.busy" :close-on-press-escape="!dialog.busy" :show-close="!dialog.busy">
      <el-form :model="dialog" @submit.prevent="submitDialog">
        <el-form-item v-for="label in dialog.labels" :key="label.name" :label="label.name" label-width="80px">
          <el-select v-if="label.options" v-model="label.data" placeholder="请选择" :disabled="dialog.busy">
            <el-option v-for="item in label.options" :key="item" :label="item" :value="item" />
          </el-select>
          <el-input v-else v-model="label.data" autocomplete="off" :disabled="dialog.busy" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="dialog.busy" @click="dialog.show = false">取 消</el-button>
        <el-button type="primary" :loading="dialog.busy" :disabled="!dialogValid" @click="submitDialog">确 定</el-button>
      </template>
    </el-dialog>
    <el-dialog title="出错啦！" v-model="errorDialog.show" width="min(90vw, 500px)">
      <span>{{ errorDialog.text }}</span>
      <template #footer><el-button type="primary" @click="errorDialog.show = false">确 定</el-button></template>
    </el-dialog>
  </el-row>
</template>

<script>
import common from '../common/common.js'
import http from '../common/http.js'
import placeholder from '../assets/timg.jpg'

export default {
  props: {
    modules: { type: Array, default: () => [] },
    activeIndex: { type: String, required: true }
  },
  emits: ['search'],
  data() {
    return {
      placeholder,
      requestSequence: 0,
      loading: { show: false, text: '' },
      errorDialog: { show: false, text: '' },
      dialog: { title: '', show: false, busy: false, action: '', name: '', kind: '', labels: [] }
    }
  },
  computed: {
    dialogValid() { return this.dialog.labels.length > 0 && this.dialog.labels.every(label => String(label.data).trim()) }
  },
  methods: {
    safeUrl(value) {
      if (!value) return undefined
      try {
        const url = new URL(value, window.location.href)
        return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
      } catch (error) { return undefined }
    },
    authorName(author) { return author && typeof author === 'object' ? author.name : author },
    async dev(name) {
      if (this.loading.show) return
      this.loading = { show: true, text: '启动开发服务中…' }
      try { await common.get(this, `/api/${this.activeIndex}/dev/${encodeURIComponent(name)}`) }
      finally { this.loading.show = false }
    },
    async install(name) {
      if (this.loading.show) return
      this.loading = { show: true, text: '安装中…' }
      try {
        if (await common.get(this, `/api/${this.activeIndex}/install/${encodeURIComponent(name)}`, '安装成功')) this.$emit('search')
      } finally { this.loading.show = false }
    },
    openCopy(item) {
      if (this.loading.show || this.dialog.busy) return
      ++this.requestSequence
      this.dialog = {
        show: true, busy: false, title: '复制', action: 'copy', name: item.name, kind: this.activeIndex,
        labels: [{ name: '名称', data: '' }]
      }
    },
    async openPublish(item) {
      if (this.loading.show || this.dialog.busy) return
      const sequence = ++this.requestSequence
      const kind = this.activeIndex
      this.loading = { show: true, text: '读取发布环境…' }
      try {
        const response = await http.get('/api/getConfig')
        if (Number(response.body.code) !== 0) throw new Error(response.body.stderr || '配置读取失败')
        if (sequence !== this.requestSequence) return
        const environments = Object.keys(response.body.data.qiniu || {})
        if (!environments.length) throw new Error('请先配置发布环境')
        const versionParts = /^(\d+)\.(\d+)\.(\d+)$/.exec(item.version || '')
        const version = versionParts ? `${versionParts[1]}.${versionParts[2]}.${Number(versionParts[3]) + 1}` : (item.version || '1.0.0')
        this.dialog = {
          show: true, busy: false, title: '发布', action: 'publish', name: item.name, kind,
          labels: [
            { name: '版本号', data: version },
            { name: '环境', data: environments.includes('test') ? 'test' : environments[0], options: environments }
          ]
        }
      } catch (error) {
        if (sequence === this.requestSequence) this.$message({ message: error.message || '请求失败', type: 'error' })
      } finally {
        if (sequence === this.requestSequence) this.loading.show = false
      }
    },
    async submitDialog() {
      if (this.dialog.busy || !this.dialogValid) return
      const dialog = this.dialog
      dialog.busy = true
      const values = dialog.labels.map(label => encodeURIComponent(String(label.data).trim()))
      const url = `/api/${dialog.kind}/${dialog.action}/${encodeURIComponent(dialog.name)}/${values.join('/')}`
      this.loading = { show: true, text: dialog.action === 'publish' ? '发布中…' : '复制中…' }
      try {
        const response = await http.get(url)
        if (Number(response.body.status) !== 0) throw new Error(response.body.stderr || response.statusText || '操作失败')
        dialog.show = false
        this.$emit('search')
        this.$message({ message: dialog.action === 'publish' ? '发布成功' : '复制成功', type: 'success' })
      } catch (error) {
        this.errorDialog = { show: true, text: error.message || '请求失败' }
      } finally {
        dialog.busy = false
        this.loading.show = false
      }
    },
    open(href) {
      const url = this.safeUrl(href)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    }
  },
  beforeUnmount() { ++this.requestSequence }
}
</script>

<style scoped>
  .el-col {
    margin: 10px 4.166665%;
  }
  .el-col .description {
    overflow: hidden;
    height: 20px;
  }
  .el-col .info {
    color: #bfcbd9;
  }
  .el-col .info .name {
    float: left;
  }
  .el-col .info .author {
    float: right;
  }
  .box {
    position: relative;
  }
  .box .tag {
    position: absolute;
    right: 0;
    top: 0;
    background-color: #324157;
    color: #fff;
  }
  .time {
    font-size: 13px;
    color: #999;
  }

  .el-button {
    margin-left: 10px;
  }

  .bottom {
    margin-top: 13px;
    line-height: 12px;
  }

  .button {
    padding: 0;
    float: right;
  }

  .image {
    width: 100%;
    display: block;
  }

  .clearfix:before,
  .clearfix:after {
      display: table;
      content: "";
  }
  
  .clearfix:after {
      clear: both
  }
</style>