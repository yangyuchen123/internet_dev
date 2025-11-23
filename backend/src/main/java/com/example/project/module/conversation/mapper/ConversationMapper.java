package com.example.project.module.conversation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.project.module.conversation.entity.Conversation;
import com.example.project.module.conversation.vo.ConversationVO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ConversationMapper extends BaseMapper<Conversation> {

    /**
     * 创建会话
     */
    void insertConversation(Conversation conversation);

    /**
     * 通过id获取会话详情
     */
    Conversation getConversationById(Long conversationId);

    /**
     * 删除会话
     */
    void deleteConversationById(Long conversationId);
}
