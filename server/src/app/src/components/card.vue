<template>
  <el-row >
    <el-col v-loading.body="loading.show" :element-loading-text="loading.text" :xs="6" :sm="6" :md="4" :lg="4" v-for="(o, index) in modules" :key="index" :offset="index > -1 ? 2 : 0">
      <el-card :body-style="{ padding: '0px' }">
        <div class="box">
          <span v-if="o.local" class="tag">本地</span>
          <a :href="o.demo" target="_blank">
            <img :src="o.screenShot || 'http://on3c42yt0.bkt.clouddn.com/timg.jpg'" class="image">
          </a>
          <div style="padding: 14px;">
          <div class="info clearfix description">
              <el-tooltip placement="top">
                <span slot="content">{{o.description}}</span>
                <a>{{o.description}}</a>
              </el-tooltip>
            </div>
            <div class="info clearfix">
              <span class="name">{{o.name}}@{{o.version}}</span>
              <span class="author">{{o.author}}</span>
            </div>

            <div class="bottom clearfix">
              <el-button type="text" class="button" @click="publish(false, o)" v-if="o.local !== false">发布</el-button>

              <el-button v-if="o.local !== false" type="text" class="button" @click="copy(false, index)">复制</el-button>
              <el-button v-if="o.local !== false" type="text" @click="dev(o.name)" class="button">开发</el-button>
              <!-- <time class="time">{{ currentDate }}</time> -->
              <el-button type="text" class="button" v-if="0">截图</el-button>
              <el-button type="text" @click="install(o.name)" class="button" v-if="o.local === false">安装</el-button>
              <el-button type="text" v-if="o.release_url" @click="open(o.release_url)" class="button">线上</el-button>
              <!-- <el-button type="text" v-if="o.demo" @click="open(o.demo)" class="button">demo</el-button> -->
            </div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-dialog :title="dialog.title" v-model="dialog.show">
      <el-form :model="dialog">
        <div v-for="label in dialog.label">
          <el-form-item v-if="!label.type" :label="label.name" label-width="60px">
            <el-input v-model="label.data" auto-complete="off"></el-input>
          </el-form-item>
          <el-form-item v-if="label.type === 'select'" :label="label.name" label-width="60px">
            <el-select  v-model="label.data" placeholder="请选择">
              <el-option
                v-for="item in label.options"
                :key="item"
                :label="item"
                :value="item">
              </el-option>
            </el-select>
          </el-form-item>
        </div>
        </el-select>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialog.show = false">取 消</el-button>
        <el-button type="primary" @click="callBack(dialog.functionName, dialog.parmas)">确 定</el-button>
      </div>
    </el-dialog>
    <el-dialog title="出错啦！" v-model="errorDialog.show" size="tiny">
      <span>{{errorDialog.text}}</span>
      <span slot="footer" class="dialog-footer">
        <el-button @click="errorDialog.show = false">取 消</el-button>
        <el-button type="primary" @click="errorDialog.show = false">确 定</el-button>
      </span>
    </el-dialog>
  </el-row>
</template>

<script>
import common from '../common/common.js';

export default {
  props: {
    modules: {
      type: Array
    },
    activeIndex: String
  },
  data() {
    return {
      currentDate: new Date(),
      dialogFormVisible: false,
      copyData: {
        from: '',
        to: '',
        show: false
      },
      loading: {
        show: false,
        text: ''
      },
      errorDialog: {
        show: false,
        text: ''
      },
      dialog: {
        title: '',
        show: false,
        functionName: '',
        parmas: {},
        label: [{
          name: '',
          data: ''
        }]
      }
    };
  },
  methods: {
    callBack (functionName, data) {
      this.dialog.show = false;
      this[functionName](true, data);
    },
    dev (name) {
      common.get(this, `/api/${this.activeIndex}/dev/` + name);
    },
    install (name) {
      common.get(this, `/api/${this.activeIndex}/install/` + name)
    },
    copy (callBack, index) {
      if (!callBack) {
        this.dialog = {
          show: true,
          title: '复制模块',
          label: [{
            name: '名称',
            data: ''
          }],
          functionName: 'copy'
        }
        this.copyData.from = this.modules[index].name;
        return;
      }

      let that = this;
      this.dialog.show = false;
      this.copyData.to = this.dialog.label[0].data;
      if (1) {
        this.$http.get(`/api/${this.activeIndex}/copy/${this.copyData.from}/${this.copyData.to}`)
        .then(res => {
          if (res.status == 200 && res.body.status == 0) {
            this.$emit('search');
            this.$message({
              message: '复制成功',
              type: 'success'
            });
          } else {
            this.$message({
              message: res.body.stderr || res.statusText,
              type: 'error'
            });
          }
        })
        .catch( e => {
          console.log(e);
        })
      }
    },
    publish (callBack, item) {
      let {name, version = ''} = item;
      let arr = version.split('.');
      arr[arr.length - 1]++;
      version = arr.join('.');
      let that = this;
      if (!callBack) {
        this.$http.get(`/api/getConfig`)
        .then(res => {
          let config = res.body.data.qiniu;
          that.dialog = {
          show: true,
          parmas: item,
          title: '发布',
          label: [{
            name: '版本号',
            data: version
          },
          {
            name: '环境',
            type: 'select',
            data: 'test',
            options: Object.keys(config)
          }],
          functionName: 'publish'
        }
        });
        return;
      }

      that.loading.text = "发布中。。。";
      that.loading.show = true;
      let label = this.dialog.label;
      this.$http.get(`/api/${this.activeIndex}/publish/${name}/${label[0].data}/${label[1].data}`)
      .then(res => {
        that.loading.show = false;
        if (res.status == 200 && res.body.status == 0) {
          this.$emit('search');
          this.$message({
            message: '发布成功',
            type: 'success'
          });
        } else {
          that.errorDialog.show = true;
          that.errorDialog.text = res.body.stderr || res.statusText
        }
      })
      .catch( e => {
        that.loading.show = false;
        console.log(e);
      })
    },
    open (href) {
      window.open(href);
    }
  }
}
</script>

<style lang="scss" scoped>
  .el-col {
    margin: 10px 4.166665%;
    .description {
      overflow: hidden;
      height: 20px;
    }
    .info {
      color: #bfcbd9;
      .name {
        float: left;
      }
      .author {
        float: right;
      }
    }
  }
  .box {
    position: relative;
    .tag {
      position: absolute;
      right: 0;
      top: 0;
      background-color: #324157;
      color: #fff;
    }
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