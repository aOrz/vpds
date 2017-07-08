<template>
  <div id="app">
    <el-row class="tac">
      <el-col :span="12">
        <el-menu theme="dark" :gutter="20" :default-active="activeIndex" class="el-menu-demo" mode="horizontal" @select="handleSelect">
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
            <el-button slot="append" icon="search" @click="search"></el-button>
          </el-input>
        </div>
      </el-col>
    </el-row>
    <el-row>
      <v-card v-on:search="search()" :active-index="activeIndex" :modules="modules"></v-card>
    </el-row>
    <el-dialog :title="dialog.title" v-model="dialog.show">
      <el-form :model="dialog">
          <div>
              <el-form-item  v-for="label in dialog.label" :label="label.name" :key="label.name" label-width="120px">
                  <el-input  v-if="!label.type" v-model="label.data" auto-complete="off"></el-input>
                  <el-select v-if="label.type === 'select'"  v-model="label.data" placeholder="请选择">
                    <el-option
                      v-for="item in label.options"
                      v-if="item"
                      :key="item"
                      :label="item"
                      :value="item">
                    </el-option>
                  </el-select>
               </el-form-item>
            </div>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialog.show = false">取 消</el-button>
        <el-button type="primary" @click="callBack(dialog.functionName, dialog.parmas)">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import cardComponent from './components/card.vue';
import vueResource from 'vue-resource';
import Vue from 'vue';
import common from './common/common.js';

Vue.use(vueResource);

export default {
  data () {
    return {
      activeIndex: 'module',
      searchInput: '',
      modules: [],
      dialog: {
        title: '新建',
        show: false,
        functionName: '',
        parmas: {},
        label: [{
                  name: '名称',
                  data: ''
                }]
      }
    }
  },
  methods: {
    callBack (functionName, data) {
      this[functionName](data);
    },
    createNew () {
      if (this.dialog.show == false) {
        this.dialog.show = true;
        this.dialog.functionName = 'createNew';
        this.$http.get('/api/getTemplate')
        .then(res => {
           let stdout  = res.body.stdout
           let arr = stdout.split('\n');
           if (this.dialog.label.length == 1) {
              this.dialog.label.push({
               name: '模板',
               type: 'select',
               data: '',
               options: arr
              })
           };
        })
        .catch( e => {
        this.$message({
          message: '请求失败',
          type: 'error'
        });
      })
      } else {
        this.dialog.show = false;
        common.get(this, `/api/${this.activeIndex}/create/${this.dialog.label[0].data}/${this.dialog.label[1].data}`);
      }
      this.search();
    },
    handleSelect(key, keyPath) {
      this.activeIndex = key;
      this.search();
    },
    search () {
      let that = this;
      let url = `/api/${this.activeIndex}/local/all`;
      if (this.searchInput) {
        url = `/api/${this.activeIndex}/search/` + this.searchInput
      }
      this.$http.get(url)
      .then(res => {
        let rows = res.body.data.rows;
        rows.sort((a,b) => {
          let ac = a.createTime || 0;
          let bc = b.createTime || 0;
          return ac < bc;
        });
        that.modules = rows;
      })
      .catch( e => {
        this.$message({
          message: '请求失败',
          type: 'error'
        });
      })
    }
  },
  mounted () {
    let that = this;
    this.search();
  },
  components: {
    'v-card': cardComponent
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
