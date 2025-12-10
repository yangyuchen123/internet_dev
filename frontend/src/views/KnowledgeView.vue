<template>
  <div class="knowledge-container">
    <!-- 导航栏 -->
    <header class="navbar">
      <div class="navbar-brand">
        <h1 class="brand-name">智能体管理系统</h1>
      </div>
      
      <div class="navbar-user">
        <div class="user-info">
          <span class="username">{{ user?.nickname || user?.username || '用户' }}</span>
        </div>
        <button class="btn-logout" @click="handleLogout">
          <span>退出登录</span>
        </button>
      </div>
    </header>
    
    <div class="main-content">
      <!-- 左侧菜单栏 -->
      <aside class="sidebar">
        <nav class="menu">
          <ul class="menu-list">
            <li class="menu-item">
              <router-link to="/home" class="menu-link" active-class="active">
                <span class="menu-icon">🏠</span>
                <span class="menu-text">主页</span>
              </router-link>
            </li>

            <li class="menu-item">
              <router-link to="/workflow" class="menu-link" active-class="active">
                <span class="menu-icon">🔄</span>
                <span class="menu-text">工作流</span>
              </router-link>
            </li>
            <li class="menu-item">
              <router-link to="/knowledge" class="menu-link" active-class="active">
                <span class="menu-icon">📚</span>
                <span class="menu-text">知识库</span>
              </router-link>
            </li>
          </ul>
        </nav>
      </aside>
      
      <!-- 知识库页面内容 -->
      <main class="content">
        <div class="knowledge-section">
          <h2>知识库管理</h2>
          
          <!-- 知识导入部分 -->
          <div class="section-card">
            <h3>知识导入</h3>
            
            <!-- 导入原始文本 -->
            <div class="import-section">
              <h4>导入原始文本</h4>
              <div class="form-group">
                <label for="title">文档标题：</label>
                <input type="text" id="title" v-model="rawImportForm.title" placeholder="请输入文档标题">
              </div>
              <div class="form-group">
                <label for="category">文档类别：</label>
                <input type="text" id="category" v-model="rawImportForm.category" placeholder="请输入文档类别">
              </div>
              <div class="form-group">
                <label for="text">文档内容：</label>
                <textarea id="text" v-model="rawImportForm.text" rows="5" placeholder="请输入文档内容"></textarea>
              </div>
              <div class="form-group">
                <label for="keywords">关键词：</label>
                <input type="text" id="keywords" v-model="rawImportForm.keywords" placeholder="关键词1,关键词2">
              </div>
              <div class="form-group">
                <label for="chunkSize">Chunk Size：</label>
                <input type="number" id="chunkSize" v-model.number="rawImportForm.chunkSize" min="100" max="2000">
              </div>
              <div class="form-group">
                <label for="chunkOverlap">Chunk Overlap：</label>
                <input type="number" id="chunkOverlap" v-model.number="rawImportForm.chunkOverlap" min="0" max="500">
              </div>
              <button class="btn-submit" @click="handleRawImport">导入原始文本</button>
            </div>
            
            <!-- 从数据库同步 -->
            <div class="import-section">
              <h4>从数据库同步</h4>
              <div class="form-group">
                <label for="dbIds">数据ID（逗号分隔）：</label>
                <input type="text" id="dbIds" v-model="dbSyncForm.ids" placeholder="1,2,3">
              </div>
              <button class="btn-submit" @click="handleDbSync">从数据库同步</button>
            </div>
          </div>
          
          <!-- 知识检索部分 -->
          <div class="section-card">
            <h3>知识检索</h3>
            
            <!-- 向量检索 -->
            <div class="search-section">
              <h4>向量检索</h4>
              <div class="form-group">
                <label for="searchQuery">查询文本：</label>
                <input type="text" id="searchQuery" v-model="searchForm.q" placeholder="请输入查询文本">
              </div>
              <div class="form-group">
                <label for="topK">返回数量：</label>
                <input type="number" id="topK" v-model.number="searchForm.topK" min="1" max="20">
              </div>
              <div class="form-group">
                <label for="searchCategory">分类过滤（可选）：</label>
                <input type="text" id="searchCategory" v-model="searchForm.category" placeholder="请输入分类">
              </div>
              <button class="btn-submit" @click="handleVectorSearch">向量检索</button>
            </div>
            
            <!-- 混合检索 -->
            <div class="search-section">
              <h4>混合检索</h4>
              <div class="form-group">
                <label for="hybridQuery">查询文本：</label>
                <input type="text" id="hybridQuery" v-model="hybridSearchForm.q" placeholder="请输入查询文本">
              </div>
              <div class="form-group">
                <label for="hybridTopK">返回数量：</label>
                <input type="number" id="hybridTopK" v-model.number="hybridSearchForm.topK" min="1" max="20">
              </div>
              <div class="form-group">
                <label for="hybridCategory">分类过滤（可选）：</label>
                <input type="text" id="hybridCategory" v-model="hybridSearchForm.category" placeholder="请输入分类">
              </div>
              <div class="form-group">
                <label for="alpha">Alpha（语义权重）：</label>
                <input type="number" id="alpha" v-model.number="hybridSearchForm.alpha" min="0" max="1" step="0.1">
              </div>
              <div class="form-group">
                <label for="beta">Beta（关键词权重）：</label>
                <input type="number" id="beta" v-model.number="hybridSearchForm.beta" min="0" max="1" step="0.1">
              </div>
              <button class="btn-submit" @click="handleHybridSearch">混合检索</button>
            </div>
          </div>
          
          <!-- 知识管理部分 -->
          <div class="section-card">
            <h3>知识管理</h3>
            
            <!-- 根据标题删除 -->
            <div class="manage-section">
              <h4>根据标题删除</h4>
              <div class="form-group">
                <label for="deleteTitle">文档标题：</label>
                <input type="text" id="deleteTitle" v-model="deleteByTitleForm.title" placeholder="请输入要删除的文档标题">
              </div>
              <button class="btn-submit btn-delete" @click="handleDeleteByTitle">根据标题删除</button>
            </div>
            
            <!-- 根据类别删除 -->
            <div class="manage-section">
              <h4>根据类别删除</h4>
              <div class="form-group">
                <label for="deleteCategory">文档类别：</label>
                <input type="text" id="deleteCategory" v-model="deleteByCategoryForm.category" placeholder="请输入要删除的文档类别">
              </div>
              <button class="btn-submit btn-delete" @click="handleDeleteByCategory">根据类别删除</button>
            </div>
          </div>
          
          <!-- 检索结果部分 -->
          <div class="section-card" v-if="searchResults.length > 0">
            <h3>检索结果</h3>
            <div class="results-list">
              <div class="result-item" v-for="(result, index) in searchResults" :key="index">
                <h4>{{ result.title || '无标题' }}</h4>
                <p class="result-category">类别：{{ result.category || '未分类' }}</p>
                <p class="result-content">{{ result.text }}</p>
                <p class="result-score">相似度：{{ result.score || 0 }}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import api from '../utils/api.js'

export default {
  name: 'KnowledgeView',
  data() {
    return {
      user: null,
      
      // 原始文本导入表单
      rawImportForm: {
        title: '',
        category: '',
        text: '',
        keywords: '',
        chunkSize: 500,
        chunkOverlap: 50,
        user: ''
      },
      
      // 数据库同步表单
      dbSyncForm: {
        ids: '',
        user: ''
      },
      
      // 向量检索表单
      searchForm: {
        q: '',
        topK: 5,
        category: ''
      },
      
      // 混合检索表单
      hybridSearchForm: {
        q: '',
        topK: 5,
        category: '',
        alpha: 0.7,
        beta: 0.3
      },
      
      // 根据标题删除表单
      deleteByTitleForm: {
        title: ''
      },
      
      // 根据类别删除表单
      deleteByCategoryForm: {
        category: ''
      },
      
      // 检索结果
      searchResults: []
    }
  },
  mounted() {
    // 获取用户信息
    this.getUserInfo()
    
    // 检查登录状态
    this.checkLoginStatus()
  },
  methods: {
    // 获取用户信息
    getUserInfo() {
      this.user = api.auth.getCurrentUser()
      if (this.user) {
        this.rawImportForm.user = this.user.username || this.user.email
        this.dbSyncForm.user = this.user.username || this.user.email
      }
    },
    
    // 检查登录状态
    checkLoginStatus() {
      if (!api.auth.isLoggedIn()) {
        // 没有登录，跳转到登录页
        this.$router.push('/login')
      }
    },
    
    // 处理退出登录
    async handleLogout() {
      try {
        // 使用API工具调用退出登录接口
        await api.auth.logout()
      } catch (error) {
        console.error('退出登录失败:', error)
      } finally {
        // 无论如何都跳转到登录页
        this.$router.push('/login')
      }
    },
    
    // 处理原始文本导入
    async handleRawImport() {
      try {
        // 验证表单
        if (!this.rawImportForm.title || !this.rawImportForm.text) {
          alert('请填写文档标题和内容')
          return
        }
        
        // 调用API
        const response = await api.knowledge.ingestRaw(this.rawImportForm)
        alert('原始文本导入成功')
        
        // 清空表单
        this.rawImportForm = {
          title: '',
          category: '',
          text: '',
          keywords: '',
          chunkSize: 500,
          chunkOverlap: 50,
          user: this.user.username || this.user.email
        }
      } catch (error) {
        console.error('原始文本导入失败:', error)
        alert('原始文本导入失败，请稍后重试')
      }
    },
    
    // 处理数据库同步
    async handleDbSync() {
      try {
        // 验证表单
        if (!this.dbSyncForm.ids) {
          alert('请填写数据ID')
          return
        }
        
        // 解析IDs
        const ids = this.dbSyncForm.ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        if (ids.length === 0) {
          alert('请填写有效的数据ID')
          return
        }
        
        // 调用API
        const response = await api.knowledge.syncDb({
          ids: ids,
          user: this.dbSyncForm.user
        })
        alert('数据库同步成功')
        
        // 清空表单
        this.dbSyncForm.ids = ''
      } catch (error) {
        console.error('数据库同步失败:', error)
        alert('数据库同步失败，请稍后重试')
      }
    },
    
    // 处理向量检索
    async handleVectorSearch() {
      try {
        // 验证表单
        if (!this.searchForm.q) {
          alert('请填写查询文本')
          return
        }
        
        // 调用API
        const response = await api.knowledge.search(this.searchForm)
        this.searchResults = response.data || []
      } catch (error) {
        console.error('向量检索失败:', error)
        alert('向量检索失败，请稍后重试')
      }
    },
    
    // 处理混合检索
    async handleHybridSearch() {
      try {
        // 验证表单
        if (!this.hybridSearchForm.q) {
          alert('请填写查询文本')
          return
        }
        
        // 调用API
        const response = await api.knowledge.hybridSearch(this.hybridSearchForm)
        this.searchResults = response.data || []
      } catch (error) {
        console.error('混合检索失败:', error)
        alert('混合检索失败，请稍后重试')
      }
    },
    
    // 处理根据标题删除
    async handleDeleteByTitle() {
      try {
        // 验证表单
        if (!this.deleteByTitleForm.title) {
          alert('请填写文档标题')
          return
        }
        
        // 确认删除
        if (!confirm('确定要删除该文档吗？')) {
          return
        }
        
        // 调用API
        const response = await api.knowledge.deleteByTitle(this.deleteByTitleForm.title)
        alert('文档删除成功')
        
        // 清空表单
        this.deleteByTitleForm.title = ''
      } catch (error) {
        console.error('文档删除失败:', error)
        alert('文档删除失败，请稍后重试')
      }
    },
    
    // 处理根据类别删除
    async handleDeleteByCategory() {
      try {
        // 验证表单
        if (!this.deleteByCategoryForm.category) {
          alert('请填写文档类别')
          return
        }
        
        // 确认删除
        if (!confirm('确定要删除该类别的所有文档吗？')) {
          return
        }
        
        // 调用API
        const response = await api.knowledge.deleteByCategory(this.deleteByCategoryForm.category)
        alert('文档删除成功')
        
        // 清空表单
        this.deleteByCategoryForm.category = ''
      } catch (error) {
        console.error('文档删除失败:', error)
        alert('文档删除失败，请稍后重试')
      }
    }
  }
}
</script>

<style scoped>
.knowledge-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Arial', sans-serif;
}

/* 导航栏样式 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.navbar-brand .brand-name {
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info .username {
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
}

.btn-logout {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-logout:hover {
  background-color: #5a67d8;
}

/* 主内容区样式 */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左侧菜单栏样式 */
.sidebar {
  width: 200px;
  background-color: #f7fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

/* 菜单样式 */
.menu {
  padding: 16px 0;
  flex: 1;
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-item {
  margin-bottom: 4px;
}

.menu-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  text-decoration: none;
  color: #4a5568;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  border-radius: 0 6px 6px 0;
}

.menu-link:hover {
  background-color: #edf2f7;
  color: #2d3748;
}

.menu-link.active {
  background-color: #667eea;
  color: white;
}

.menu-icon {
  font-size: 18px;
}

.menu-text {
  flex: 1;
}

/* 内容区样式 */
.content {
  flex: 1;
  padding: 24px;
  background-color: #f8fafc;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* 知识库页面样式 */
.knowledge-section {
  max-width: 1200px;
  width: 100%;
}

.knowledge-section h2 {
  margin-bottom: 24px;
  font-size: 28px;
  font-weight: 600;
  color: #2d3748;
}

/* 卡片样式 */
.section-card {
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-card h3 {
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
}

/* 表单样式 */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #4a5568;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  color: #2d3748;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

/* 按钮样式 */
.btn-submit {
  padding: 10px 20px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-submit:hover {
  background-color: #5a67d8;
}

.btn-delete {
  background-color: #e53e3e;
}

.btn-delete:hover {
  background-color: #c53030;
}

/* 导入、搜索、管理部分样式 */
.import-section,
.search-section,
.manage-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.import-section:last-child,
.search-section:last-child,
.manage-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.import-section h4,
.search-section h4,
.manage-section h4 {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #4a5568;
}

/* 检索结果样式 */
.results-list {
  margin-top: 16px;
}

.result-item {
  padding: 16px;
  margin-bottom: 16px;
  background-color: #f7fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.result-item h4 {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
}

.result-category,
.result-score {
  margin-bottom: 8px;
  font-size: 14px;
  color: #718096;
}

.result-content {
  margin-bottom: 8px;
  font-size: 14px;
  color: #4a5568;
  line-height: 1.5;
}
</style>