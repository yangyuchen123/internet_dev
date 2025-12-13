<template>
  <div class="knowledge-container">
    <!-- 导航栏 -->
    <header class="navbar">
      <div class="navbar-brand">
        <div class="logo-icon">🤖</div>
        <h1 class="brand-name">智能体管理系统</h1>
      </div>
      
      <div class="navbar-user">
        <div class="user-info">
          <span class="avatar">{{ user?.nickname?.[0] || user?.username?.[0] || 'U' }}</span>
          <span class="username">{{ user?.nickname || user?.username || '用户' }}</span>
        </div>
        <button class="btn-logout" @click="handleLogout" title="退出登录">
          <span class="icon">⏻</span>
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
            <li class="menu-item">
              <router-link to="/conversation" class="menu-link" active-class="active">
                <span class="menu-icon">💬</span>
                <span class="menu-text">会话管理</span>
              </router-link>
            </li>
          </ul>
        </nav>
      </aside>
      
      <!-- 知识库页面内容 -->
      <main class="content">
        <div class="knowledge-section">
          <div class="section-header">
            <h2>知识库管理</h2>
            <p class="subtitle">管理您的向量数据、同步文档及执行混合检索</p>
          </div>
          
          <!-- 功能卡片网格布局 -->
          <div class="dashboard-grid">
            
            <!-- 1. 知识导入模块 -->
            <div class="module-card import-card">
              <div class="card-header">
                <div class="icon-bg blue">📥</div>
                <h3>知识导入</h3>
              </div>
              <p class="card-desc">支持原始文本录入或从现有数据库同步数据。</p>
              <div class="module-buttons">
                <button class="module-btn secondary" @click="showModal('rawImport')">
                  <span class="btn-icon">📄</span>
                  <span>导入文本</span>
                </button>
                <button class="module-btn secondary" @click="showModal('dbSync')">
                  <span class="btn-icon">🗄️</span>
                  <span>DB 同步</span>
                </button>
              </div>
            </div>
            
            <!-- 2. 知识检索模块 -->
            <div class="module-card search-card">
              <div class="card-header">
                <div class="icon-bg purple">🔍</div>
                <h3>知识检索</h3>
              </div>
              <p class="card-desc">测试向量相似度搜索或带权重的混合检索。</p>
              <div class="module-buttons">
                <button class="module-btn secondary" @click="showModal('vectorSearch')">
                  <span class="btn-icon">⚡</span>
                  <span>向量检索</span>
                </button>
                <button class="module-btn secondary" @click="showModal('hybridSearch')">
                  <span class="btn-icon">🧠</span>
                  <span>混合检索</span>
                </button>
              </div>
            </div>
            
            <!-- 3. 向量库计数模块 -->
            <div class="module-card stat-card">
              <div class="card-header">
                <div class="icon-bg green">📊</div>
                <h3>数据统计</h3>
              </div>
               <p class="card-desc">实时查看向量库中的数据总量或分类统计。</p>
              <div class="module-buttons">
                <button class="module-btn secondary" @click="handleCountVector('all')">
                  <span>全部计数</span>
                </button>
                <button class="module-btn secondary" @click="showModal('countByCategory')">
                  <span>分类计数</span>
                </button>
              </div>
              <transition name="fade">
                <div v-if="vectorCount !== null" class="count-result-badge">
                  <span class="label">当前计数</span>
                  <span class="value">{{ vectorCount }}</span>
                </div>
              </transition>
            </div>

             <!-- 4. 知识删除模块 -->
            <div class="module-card danger-card">
              <div class="card-header">
                <div class="icon-bg red">🗑️</div>
                <h3>数据清理</h3>
              </div>
               <p class="card-desc">危险操作：根据条件永久删除向量数据。</p>
              <div class="module-buttons">
                <button class="module-btn danger-ghost" @click="showModal('deleteByTitle')">
                  <span>按标题删</span>
                </button>
                <button class="module-btn danger-ghost" @click="showModal('deleteByCategory')">
                  <span>按类别删</span>
                </button>
              </div>
            </div>
          </div>
          
          <!-- 检索结果部分 -->
          <transition name="slide-up">
            <div class="results-section" v-if="searchResults.length > 0">
              <div class="section-title">
                <h3>检索结果</h3>
                <span class="badge">{{ searchResults.length }} 条匹配</span>
              </div>
              <div class="results-list">
                <div class="result-item" v-for="(result, index) in searchResults" :key="index">
                  <div class="result-header">
                    <h4>{{ result.title || '无标题文档' }}</h4>
                    <span class="score-badge" :class="{'high': result.score > 0.8, 'med': result.score > 0.5}">
                      相似度: {{ (result.score || 0).toFixed(4) }}
                    </span>
                  </div>
                  <div class="result-meta">
                    <span class="tag">📂 {{ result.category || '未分类' }}</span>
                  </div>
                  <div class="result-content">
                    <p>{{ result.text }}</p>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </main>
    </div>
    
    <!-- 弹窗组件 -->
    <transition name="modal-fade">
      <div v-if="currentModal" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>{{ modalTitles[currentModal] }}</h3>
            <button class="btn-close" @click="closeModal">&times;</button>
          </div>
          
          <div class="modal-body">
            <!-- 原始文本导入 -->
            <div v-if="currentModal === 'rawImport'">
              <div class="form-row">
                <div class="form-group half">
                  <label for="title">文档标题</label>
                  <input type="text" id="title" v-model="rawImportForm.title" placeholder="例如：产品说明书 V1.0">
                </div>
                <div class="form-group half">
                  <label for="category">文档类别</label>
                  <input type="text" id="category" v-model="rawImportForm.category" placeholder="例如：manual">
                </div>
              </div>
              <div class="form-group">
                <label for="text">文档内容</label>
                <textarea id="text" v-model="rawImportForm.text" rows="6" placeholder="在此粘贴需要向量化的文本内容..."></textarea>
              </div>
              <div class="form-group">
                <label for="keywords">关键词标签</label>
                <input type="text" id="keywords" v-model="rawImportForm.keywords" placeholder="标签之间用逗号分隔">
              </div>
              <div class="form-row">
                <div class="form-group half">
                  <label for="chunkSize">分块大小 (Chunk Size)</label>
                  <input type="number" id="chunkSize" v-model.number="rawImportForm.chunkSize" min="100" max="2000">
                </div>
                <div class="form-group half">
                  <label for="chunkOverlap">重叠大小 (Overlap)</label>
                  <input type="number" id="chunkOverlap" v-model.number="rawImportForm.chunkOverlap" min="0" max="500">
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn-submit" @click="handleRawImport">开始导入</button>
              </div>
            </div>
            
            <!-- 数据库同步 -->
            <div v-if="currentModal === 'dbSync'">
              <div class="form-group">
                <label for="dbIds">数据 ID 列表</label>
                <input type="text" id="dbIds" v-model="dbSyncForm.ids" placeholder="例如：101, 102, 103">
                <p class="form-hint">请输入数据库中的主键 ID，多个 ID 用逗号分隔。</p>
              </div>
              <div class="modal-footer">
                <button class="btn-submit" @click="handleDbSync">同步数据</button>
              </div>
            </div>
            
            <!-- 向量检索 -->
            <div v-if="currentModal === 'vectorSearch'">
              <div class="form-group">
                <label for="searchQuery">查询内容</label>
                <div class="input-with-icon">
                  <input type="text" id="searchQuery" v-model="searchForm.q" placeholder="描述您想查找的内容...">
                  <span class="input-icon">🔍</span>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group half">
                  <label for="topK">返回条数 (Top K)</label>
                  <input type="number" id="topK" v-model.number="searchForm.topK" min="1" max="20">
                </div>
                <div class="form-group half">
                  <label for="searchCategory">限定分类 (可选)</label>
                  <input type="text" id="searchCategory" v-model="searchForm.category" placeholder="全部">
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn-submit" @click="handleVectorSearch">开始检索</button>
              </div>
            </div>
            
            <!-- 混合检索 -->
            <div v-if="currentModal === 'hybridSearch'">
              <div class="form-group">
                <label for="hybridQuery">查询内容</label>
                <input type="text" id="hybridQuery" v-model="hybridSearchForm.q" placeholder="描述您想查找的内容...">
              </div>
              <div class="form-row">
                <div class="form-group half">
                  <label for="hybridTopK">返回条数</label>
                  <input type="number" id="hybridTopK" v-model.number="hybridSearchForm.topK" min="1" max="20">
                </div>
                <div class="form-group half">
                  <label for="hybridCategory">限定分类</label>
                  <input type="text" id="hybridCategory" v-model="hybridSearchForm.category" placeholder="全部">
                </div>
              </div>
              <div class="slider-group">
                <div class="slider-item">
                  <label>语义权重 (Alpha): {{ hybridSearchForm.alpha }}</label>
                  <input type="range" v-model.number="hybridSearchForm.alpha" min="0" max="1" step="0.1">
                </div>
                <div class="slider-item">
                  <label>关键词权重 (Beta): {{ hybridSearchForm.beta }}</label>
                  <input type="range" v-model.number="hybridSearchForm.beta" min="0" max="1" step="0.1">
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn-submit" @click="handleHybridSearch">执行混合检索</button>
              </div>
            </div>
            
            <!-- 根据标题删除 -->
            <div v-if="currentModal === 'deleteByTitle'">
              <div class="form-group">
                <label for="deleteTitle">精确匹配标题</label>
                <input type="text" id="deleteTitle" v-model="deleteByTitleForm.title" placeholder="输入完整标题">
              </div>
              <div class="modal-footer">
                <button class="btn-submit btn-delete" @click="handleDeleteByTitle">确认删除</button>
              </div>
            </div>
            
            <!-- 根据类别删除 -->
            <div v-if="currentModal === 'deleteByCategory'">
              <div class="form-group">
                <label for="deleteCategory">目标类别</label>
                <input type="text" id="deleteCategory" v-model="deleteByCategoryForm.category" placeholder="输入类别名称">
              </div>
              <div class="warning-box">
                ⚠️ 注意：此操作将删除该类别下的所有文档，不可恢复。
              </div>
              <div class="modal-footer">
                <button class="btn-submit btn-delete" @click="handleDeleteByCategory">确认清空类别</button>
              </div>
            </div>
            
            <!-- 根据类别计数 -->
            <div v-if="currentModal === 'countByCategory'">
              <div class="form-group">
                <label for="countCategory">统计类别</label>
                <input type="text" id="countCategory" v-model="countByCategoryForm.category" placeholder="输入类别名称">
              </div>
              <div class="modal-footer">
                <button class="btn-submit" @click="handleCountVector('category')">查询数量</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
// 脚本逻辑保持不变
import api from '../utils/api.js'

export default {
  name: 'KnowledgeView',
  data() {
    return {
      user: null,
      currentModal: null,
      modalTitles: {
        rawImport: '导入原始文本',
        dbSync: '从数据库同步',
        vectorSearch: '向量检索',
        hybridSearch: '混合检索',
        deleteByTitle: '根据标题删除',
        deleteByCategory: '根据类别删除',
        countByCategory: '根据类别计数'
      },
      rawImportForm: {
        source: 'raw',
        title: '',
        category: '',
        text: '',
        keywords: '',
        chunkSize: 500,
        chunkOverlap: 50,
        user: ''
      },
      dbSyncForm: {
        ids: '',
        user: ''
      },
      searchForm: {
        q: '',
        topK: 5,
        category: '',
        user: ''
      },
      hybridSearchForm: {
        q: '',
        topK: 5,
        category: '',
        alpha: 0.7,
        beta: 0.3,
        user: ''
      },
      deleteByTitleForm: {
        title: '',
        user: ''
      },
      deleteByCategoryForm: {
        category: '',
        user: ''
      },
      countByCategoryForm: {
        category: '',
        user: ''
      },
      searchResults: [],
      vectorCount: null
    }
  },
  mounted() {
    this.getUserInfo()
    this.checkLoginStatus()
  },
  methods: {
    getUserInfo() {
      this.user = api.auth.getCurrentUser()
      if (this.user) {
        this.rawImportForm.user = this.user.username || this.user.email
        this.dbSyncForm.user = this.user.username || this.user.email
        this.searchForm.user = this.user.username || this.user.email
        this.hybridSearchForm.user = this.user.username || this.user.email
        this.deleteByTitleForm.user = this.user.username || this.user.email
        this.deleteByCategoryForm.user = this.user.username || this.user.email
        this.countByCategoryForm.user = this.user.username || this.user.email
      }
    },
    showModal(modalName) {
      this.currentModal = modalName
    },
    closeModal() {
      this.currentModal = null
    },
    checkLoginStatus() {
      if (!api.auth.isLoggedIn()) {
        this.$router.push('/login')
      }
    },
    async handleLogout() {
      try {
        await api.auth.logout()
      } catch (error) {
        console.error('退出登录失败:', error)
      } finally {
        this.$router.push('/login')
      }
    },
    async handleRawImport() {
      try {
        if (!this.rawImportForm.title || !this.rawImportForm.text) {
          alert('请填写文档标题和内容')
          return
        }
        this.getUserInfo()
        await api.knowledge.ingestRaw(this.rawImportForm)
        alert('原始文本导入成功')
        this.rawImportForm = {
          source: 'raw',
          title: '',
          category: '',
          text: '',
          keywords: '',
          chunkSize: 500,
          chunkOverlap: 50,
          user: this.user.username || this.user.email
        }
        this.closeModal()
      } catch (error) {
        console.error('原始文本导入失败:', error)
        alert('原始文本导入失败，请稍后重试')
      }
    },
    async handleDbSync() {
      try {
        if (!this.dbSyncForm.ids) {
          alert('请填写数据ID')
          return
        }
        const ids = this.dbSyncForm.ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        if (ids.length === 0) {
          alert('请填写有效的数据ID')
          return
        }
        this.getUserInfo()
        await api.knowledge.syncDb({
          ids: ids,
          user: this.dbSyncForm.user
        })
        alert('数据库同步成功')
        this.dbSyncForm.ids = ''
        this.closeModal()
      } catch (error) {
        console.error('数据库同步失败:', error)
        alert('数据库同步失败，请稍后重试')
      }
    },
    async handleVectorSearch() {
      try {
        if (!this.searchForm.q) {
          alert('请填写查询文本')
          return
        }
        this.getUserInfo()
        const response = await api.knowledge.search(this.searchForm)
        this.searchResults = response.data || []
        this.closeModal()
      } catch (error) {
        console.error('向量检索失败:', error)
        alert('向量检索失败，请稍后重试')
      }
    },
    async handleHybridSearch() {
      try {
        if (!this.hybridSearchForm.q) {
          alert('请填写查询文本')
          return
        }
        this.getUserInfo()
        const response = await api.knowledge.hybridSearch(this.hybridSearchForm)
        this.searchResults = response.data || []
        this.closeModal()
      } catch (error) {
        console.error('混合检索失败:', error)
        alert('混合检索失败，请稍后重试')
      }
    },
    async handleDeleteByTitle() {
      try {
        if (!this.deleteByTitleForm.title) {
          alert('请填写文档标题')
          return
        }
        if (!confirm('确定要删除该文档吗？')) {
          return
        }
        this.getUserInfo()
        await api.knowledge.deleteByTitle(this.deleteByTitleForm)
        alert('文档删除成功')
        this.deleteByTitleForm.title = ''
        this.closeModal()
      } catch (error) {
        console.error('文档删除失败:', error)
        alert('文档删除失败，请稍后重试')
      }
    },
    async handleDeleteByCategory() {
      try {
        if (!this.deleteByCategoryForm.category) {
          alert('请填写文档类别')
          return
        }
        if (!confirm('确定要删除该类别的所有文档吗？')) {
          return
        }
        this.getUserInfo()
        await api.knowledge.deleteByCategory(this.deleteByCategoryForm)
        alert('文档删除成功')
        this.deleteByCategoryForm.category = ''
        this.closeModal()
      } catch (error) {
        console.error('文档删除失败:', error)
        alert('文档删除失败，请稍后重试')
      }
    },
    async handleCountVector(type) {
      try {
        this.getUserInfo()
        let countData = {
          user: this.user.username || this.user.email,
          category: ''
        }
        if (type === 'category') {
          countData.category = this.countByCategoryForm.category
        }
        const response = await api.knowledge.countVector(countData)
        this.vectorCount = response.count || response.data || '未知'
        alert(`向量库数据条数获取成功: ${this.vectorCount}`)
        if (type === 'category') {
          this.closeModal()
        }
      } catch (error) {
        console.error('获取向量库数据条数失败:', error)
        alert('获取向量库数据条数失败，请稍后重试')
      }
    }
  }
}
</script>

<style scoped>
/* 变量定义 */
:root {
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --secondary-color: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --danger-color: #ef4444;
  --success-color: #10b981;
  --border-radius: 12px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* 全局重置 */
* {
  box-sizing: border-box;
}

.knowledge-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: var(--font-sans);
  background-color: #f9fafb;
  color: var(--text-primary);
}

/* ================== Navbar ================== */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px;
  height: 70px;
  background-color: #ffffff;
  box-shadow: var(--shadow-sm);
  z-index: 50;
  border-bottom: 1px solid #e5e7eb;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: var(--primary-color);
  color: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  letter-spacing: -0.025em;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  background-color: #e0e7ff;
  color: var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.btn-logout {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-logout:hover {
  background-color: #fef2f2;
  color: var(--danger-color);
  border-color: #fecaca;
}

/* ================== Layout & Sidebar ================== */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background-color: #ffffff;
  border-right: 1px solid #e5e7eb;
  padding: 24px 16px;
  flex-shrink: 0;
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  text-decoration: none;
  color: #4b5563;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s;
}

.menu-link:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.menu-link.active {
  background-color: #e0e7ff;
  color: var(--primary-color);
  font-weight: 600;
}

/* ================== Dashboard Content ================== */
.content {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
  background-color: #f9fafb;
}

.knowledge-section {
  max-width: 1400px;
  margin: 0 auto;
}

.section-header {
  margin-bottom: 32px;
}

.section-header h2 {
  font-size: 28px;
  font-weight: 800;
  color: #111827;
  margin: 0 0 8px 0;
}

.section-header .subtitle {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

/* Grid Layout for Cards */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

/* Card Styles */
.module-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #f3f4f6;
  box-shadow: var(--shadow-md);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}

.module-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.icon-bg {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.icon-bg.blue { background: #e0e7ff; }
.icon-bg.purple { background: #f3e8ff; }
.icon-bg.green { background: #dcfce7; }
.icon-bg.red { background: #fee2e2; }

.module-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
}

.card-desc {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 24px;
  flex: 1;
}

/* Buttons inside cards */
.module-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.module-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.module-btn.primary {
  background-color: var(--primary-color);
  color: white;
}
.module-btn.primary:hover { background-color: var(--primary-hover); }

.module-btn.secondary {
  background-color: #f3f4f6;
  color: #374151;
}
.module-btn.secondary:hover { background-color: #e5e7eb; }

.module-btn.outline {
  background-color: transparent;
  border: 1px solid #e5e7eb;
  color: #374151;
}
.module-btn.outline:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.module-btn.danger-ghost {
  background-color: #fef2f2;
  color: var(--danger-color);
}
.module-btn.danger-ghost:hover {
  background-color: #fee2e2;
}

/* Stat Badge */
.count-result-badge {
  margin-top: 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.count-result-badge .label { color: #166534; font-size: 13px; font-weight: 600; }
.count-result-badge .value { color: #15803d; font-size: 20px; font-weight: 700; }

/* ================== Search Results ================== */
.results-section {
  background: white;
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  padding: 32px;
  margin-top: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.section-title h3 { font-size: 20px; font-weight: 700; margin: 0; }
.section-title .badge {
  background: #e0e7ff;
  color: var(--primary-color);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.result-item {
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.result-item:hover {
  border-color: #e0e7ff;
  background: #ffffff;
  box-shadow: var(--shadow-sm);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.result-header h4 { margin: 0; color: #111827; font-size: 16px; font-weight: 600; }

.score-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #f3f4f6;
  color: #6b7280;
  font-weight: 500;
}
.score-badge.high { background: #dcfce7; color: #166534; }
.score-badge.med { background: #fef3c7; color: #92400e; }

.result-meta { margin-bottom: 12px; }
.result-meta .tag {
  font-size: 12px;
  color: #6b7280;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}

.result-content {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
}

/* ================== Modern Modals ================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(17, 24, 39, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 550px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: #111827; }

.btn-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
}
.btn-close:hover { color: #4b5563; }

.modal-body { padding: 24px; }

/* Form Styles */
.form-group { margin-bottom: 20px; }
.form-row { display: flex; gap: 16px; margin-bottom: 20px; }
.form-group.half { flex: 1; margin-bottom: 0; }

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-group input, 
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  transition: all 0.2s;
  background: #f9fafb;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  background: white;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-hint { font-size: 12px; color: #9ca3af; margin-top: 6px; }

.input-with-icon { position: relative; }
.input-with-icon input { padding-right: 36px; }
.input-with-icon .input-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.5;
}

/* Slider */
.slider-group { background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
.slider-item { margin-bottom: 12px; }
.slider-item:last-child { margin-bottom: 0; }
.slider-item label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.slider-item input[type=range] { width: 100%; accent-color: var(--primary-color); }

.warning-box {
  background: #fef2f2;
  color: #991b1b;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 20px;
  border: 1px solid #fecaca;
}

/* ================== Modal Footer (大幅优化) ================== */
.modal-footer {
  /* 使用负 Margin 将 Footer 拉宽到贴边 */
  margin-top: 24px;
  margin-left: -24px;
  margin-right: -24px;
  margin-bottom: -24px;
  
  /* 增加背景色和边框，形成独立操作栏 */
  padding: 16px 24px;
  background-color: #f9fafb; 
  border-top: 1px solid #e5e7eb;
  
  display: flex;
  justify-content: flex-end;
  
  /* 保持圆角 */
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
}

.btn-submit {
  background-color: var(--primary-color);
  color: black;
  padding: 10px 24px; /* 增加宽度 */
  border-radius: 8px;
  font-weight: 600; /* 加粗 */
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px; /* 保证最小宽度 */
  
  /* 增加投影，提升对比度 */
  box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3), 0 2px 4px -1px rgba(79, 70, 229, 0.1);
}

.btn-submit:hover { 
  background-color: var(--primary-hover); 
  transform: translateY(-1px);
  box-shadow: 0 6px 10px -1px rgba(79, 70, 229, 0.4);
}

.btn-delete { 
  background-color: var(--danger-color);
  /* 危险按钮也增加红色投影 */
  box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3);
}

.btn-delete:hover { 
  background-color: #dc2626;
  box-shadow: 0 6px 10px -1px rgba(239, 68, 68, 0.4);
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active { transition: all 0.4s ease-out; }
.slide-up-enter-from { opacity: 0; transform: translateY(20px); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

/* Responsive */
@media (max-width: 768px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .form-row { flex-direction: column; gap: 20px; }
  .navbar { padding: 0 16px; }
  .content { padding: 20px; }
  .sidebar { display: none; }
  
  /* 移动端弹窗 Footer 适配 */
  .modal-footer {
    flex-direction: column;
  }
  .btn-submit {
    width: 100%;
  }
}
</style>