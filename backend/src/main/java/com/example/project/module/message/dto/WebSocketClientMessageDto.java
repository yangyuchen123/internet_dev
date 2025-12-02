package com.example.project.module.message.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WebSocket客户端消息DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketClientMessageDto {

    private String type;

    private String content;

    private String messageId;

}
