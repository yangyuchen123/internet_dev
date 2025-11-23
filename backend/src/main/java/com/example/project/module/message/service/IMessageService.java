package com.example.project.module.message.service;

import com.example.project.module.message.dto.SendMessageDto;
import com.example.project.module.message.vo.MessageHistoryVO;
import com.example.project.module.message.vo.SendMessageVO;

import java.time.LocalDateTime;

public interface IMessageService {

    /**
     * 发送消息
     */
    public SendMessageVO sendMessage(Long conversationId, SendMessageDto dto);

    /**
     * 获取消息历史
     */
    public MessageHistoryVO getMessageHistory(Long conversationId, int page, int limit, LocalDateTime before);

}
