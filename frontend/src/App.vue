<template>
  <router-view />
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
/* 全局样式重置 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: 'Arial', 'Helvetica', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f8fafc;
  color: #2d3748;
}

#app {
  height: 100%;
}

/* 全局链接样式 */
a {
  color: #667eea;
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  color: #5a67d8;
}

/* 全局按钮基础样式 */
button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  outline: none;
  transition: all 0.2s;
}

/* 全局输入框基础样式 */
input {
  font-family: inherit;
  outline: none;
  border: 1px solid #e2e8f0;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 通用布局类 */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

/* 响应式断点 */
@media (max-width: 768px) {
  .container {
    padding: 0 12px;
  }
}
</style>