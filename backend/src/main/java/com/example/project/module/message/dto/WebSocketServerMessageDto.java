package com.example.project.module.message.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WebSocket服务端响应消息DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketServerMessageDto {

    private String type;

    private String content;

    private String messageId;

    private String error;

}
