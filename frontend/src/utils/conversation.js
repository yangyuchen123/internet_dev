// 导入基础HTTP请求方法
import { get, post, put, del } from './user.js'

/**
 * 会话相关API
 */
export const conversationAPI = {
  /**
   * 创建会话
   * @param {Object} params - 创建会话的参数
   * @param {number} params.userId - 用户ID
   * @param {string} params.model - 模型名称
   * @param {number[]} [params.agentIds] - 智能体ID列表
   * @param {number} [params.mainAgent] - 主智能体ID
   * @param {string} [params.title] - 会话标题
   * @param {Object} [params.metadata] - 元数据
   * @param {Array} [params.messages] - 初始消息列表
   * @param {string} [params.provider] - 模型提供方
   * @param {number} [params.temperature] - 采样温度
   * @param {number} [params.maxTokens] - 最大token数
   * @returns {Promise<Object>} 创建的会话信息
   */
  async createConversation(params) {
    const response = await post('/plugin/conversation/create', params)
    return response.conversation // 根据API文档，会话信息在response.conversation中
  },

  /**
   * 更新会话
   * @param {Object} params - 更新会话的参数
   * @param {number} params.conversationId - 会话ID
   * @param {number} params.userId - 用户ID
   * @param {string} [params.model] - 模型名称
   * @param {number[]} [params.agentIds] - 智能体ID列表
   * @param {number} [params.mainAgent] - 主智能体ID
   * @param {string} [params.title] - 会话标题
   * @param {Object} [params.metadata] - 元数据
   * @param {Array} [params.messages] - 消息列表
   * @param {string} [params.provider] - 模型提供方
   * @param {number} [params.temperature] - 采样温度
   * @param {number} [params.maxTokens] - 最大token数
   * @returns {Promise<Object>} 更新后的会话信息
   */
  async updateConversation(params) {
    const response = await put('/plugin/conversation/update', params)
    return response.conversation
  },

  /**
   * 获取会话列表
   * @param {Object} params - 查询参数
   * @param {number} params.userId - 用户ID
   * @returns {Promise<Array>} 会话列表
   */
  async getConversationList(params) {
    const response = await get('/plugin/conversation/list', params)
    return response.conversations
  },

  /**
   * 删除会话
   * @param {Object} params - 删除参数
   * @param {number} params.conversationId - 会话ID
   * @param {number} params.userId - 用户ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteConversation(params) {
    const response = await del('/plugin/conversation/delete', params)
    return response
  },

  /**
   * 发送消息
   * @param {Object} params - 发送消息的参数
   * @param {number} params.conversationId - 会话ID
   * @param {number} params.userId - 用户ID
   * @param {Array} params.messages - 消息列表
   * @returns {Promise<Object>} 包含回复消息的结果
   */
  async sendMessage(params) {
    const response = await post('/plugin/message/send', params)
    return response
  }
}

export default conversationAPI