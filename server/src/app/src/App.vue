<template>
  <div class="vpds-app">
    <el-row class="tac">
      <el-col :span="12">
        <el-menu background-color="#324157" text-color="#fff" active-text-color="#409eff" :default-active="activeIndex" class="el-menu-demo" mode="horizontal" @select="handleSelect">
          <el-menu-item index="module">模块</el-menu-item>
          <el-menu-item index="page">页面</el-menu-item>
        </el-menu>
      </el-col>
      <el-col :span="2" class="new">
        <el-button type="primary" @click="createNew">新建</el-button>
      </el-col>
      <el-col :span="10">
        <div class="search">
          <el-input placeholder="请输入内容" v-model="searchInput" @input="search">
            <template #append><el-button @click="search">搜索</el-button></template>
          </el-input>
        </div>
      </el-col>
    </el-row>
    <v-card :key="activeIndex" @search="search" :active-index="activeIndex" :modules="modules" />
    <el-dialog title="新建" v-model="dialog.show" :close-on-click-modal="!dialog.busy" :close-on-press-escape="!dialog.busy" :show-close="!dialog.busy">
      <el-form :model="dialog" @submit.prevent="submitCreate">
        <el-form-item label="名称" label-width="120px">
          <el-input v-model="dialog.name" autocomplete="off" :disabled="dialog.busy" />
        </el-form-item>
        <el-form-item label="模板" label-width="120px">
          <el-select v-model="dialog.template" placeholder="请选择" :loading="dialog.loading" :disabled="dialog.busy">
            <el-option v-for="item in dialog.templates" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="dialog.busy" @click="dialog.show = false">取 消</el-button>
        <el-button type="primary" :loading="dialog.busy" :disabled="dialog.loading || !dialog.name.trim() || !dialog.template" @click="submitCreate">确 定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import cardComponent from './components/card.vue'
import http from './common/http.js'
import common from './common/common.js'

export default {
  components: { 'v-card': cardComponent },
  data() {
    return {
      activeIndex: 'module',
      searchInput: '',
      modules: [],
      searchSequence: 0,
      templateSequence: 0,
      dialog: { show: false, name: '', template: '', templates: [], loading: false, busy: false, kind: 'module' }
    }
  },
  methods: {
    async createNew() {
      if (this.dialog.busy) return
      const sequence = ++this.templateSequence
      this.dialog = { show: true, name: '', template: '', templates: [], loading: true, busy: false, kind: this.activeIndex }
      try {
        const response = await http.get('/api/getTemplate')
        if (Number(response.body.status) !== 0) throw new Error(response.body.stderr || '模板读取失败')
        if (sequence !== this.templateSequence) return
        this.dialog.templates = String(response.body.stdout || '').split('\n').map(item => item.trim()).filter(Boolean)
      } catch (error) {
        if (sequence === this.templateSequence) this.$message({ message: error.message || '请求失败', type: 'error' })
      } finally {
        if (sequence === this.templateSequence) this.dialog.loading = false
      }
    },
    async submitCreate() {
      if (this.dialog.busy || this.dialog.loading || !this.dialog.name.trim() || !this.dialog.template) return
      this.dialog.busy = true
      try {
        const success = await common.get(this, `/api/${this.dialog.kind}/create/${encodeURIComponent(this.dialog.name.trim())}/${encodeURIComponent(this.dialog.template)}`, '创建成功')
        if (success) {
          this.dialog.show = false
          await this.search()
        }
      } finally {
        this.dialog.busy = false
      }
    },
    handleSelect(key) {
      this.activeIndex = key
      this.modules = []
      this.search()
    },
    async search() {
      const sequence = ++this.searchSequence
      const url = this.searchInput
        ? `/api/${this.activeIndex}/search/${encodeURIComponent(this.searchInput)}`
        : `/api/${this.activeIndex}/local/all`
      try {
        const response = await http.get(url)
        if (Number(response.body.status) !== 0) throw new Error(response.body.stderr || '查询失败')
        if (sequence !== this.searchSequence) return
        this.modules = response.body.data.rows.slice().sort((a, b) => (b.createTime || 0) - (a.createTime || 0))
      } catch (error) {
        if (sequence === this.searchSequence) this.$message({ message: error.message || '请求失败', type: 'error' })
      }
    }
  },
  mounted() { this.search() },
  beforeUnmount() {
    ++this.searchSequence
    ++this.templateSequence
  }
}
</script>

<style>
  body {
    font-family: Helvetica, sans-serif;
    margin: 0;
  }
  .new {
    margin-top: 10px;
  }
  .tac {
    background-color: #324157;
  }
  .search {
    padding-top: 10px;
    padding-right: 20px;
  }
  .time {
    font-size: 13px;
    color: #999;
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
