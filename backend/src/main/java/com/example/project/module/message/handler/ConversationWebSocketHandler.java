package com.example.project.module.message.handler;

import com.example.project.common.utils.JwtUtil;
import com.example.project.module.conversation.mapper.ConversationMapper;
import com.example.project.module.message.dto.WebSocketClientMessageDto;
import com.example.project.module.message.dto.WebSocketServerMessageDto;
import com.example.project.module.message.entity.Message;
import com.example.project.module.message.mapper.MessageMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket消息处理器
 */
@Component
@RequiredArgsConstructor
public class ConversationWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final JwtUtil jwtUtil;
    private final MessageMapper messageMapper;
    private final ConversationMapper conversationMapper;
    
    // 存储会话信息 <sessionId, conversationId>
    private final Map<String, Long> sessionConversationMap = new ConcurrentHashMap<>();
    
    // 存储用户信息 <sessionId, userId>
    private final Map<String, Long> sessionUserMap = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // 从URL路径中提取 conversation_id
        String path = session.getUri().getPath();
        Long conversationId = extractConversationId(path);
        
        if (conversationId == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }
        
        // 验证JWT token（从查询参数或header中获取）
        Long userId = authenticateSession(session);
        if (userId == null) {
            sendError(session, null, "未授权：无效的token");
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }
        
        // 验证会话是否存在
        if (conversationMapper.getConversationById(conversationId) == null) {
            sendError(session, null, "会话不存在");
            session.close(CloseStatus.BAD_DATA);
            return;
        }
        
        // 保存会话信息
        sessionConversationMap.put(session.getId(), conversationId);
        sessionUserMap.put(session.getId(), userId);
        
        System.out.println("WebSocket连接建立: sessionId=" + session.getId() + 
                         ", conversationId=" + conversationId + 
                         ", userId=" + userId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            // 解析客户端消息
            WebSocketClientMessageDto clientMsg = objectMapper.readValue(
                message.getPayload(), 
                WebSocketClientMessageDto.class
            );
            
            Long conversationId = sessionConversationMap.get(session.getId());
            Long userId = sessionUserMap.get(session.getId());
            
            if (conversationId == null || userId == null) {
                sendError(session, null, "会话未初始化");
                return;
            }
            
            // 验证消息类型
            if (!"message".equals(clientMsg.getType())) {
                sendError(session, clientMsg.getMessageId(), "不支持的消息类型");
                return;
            }
            
            // 保存用户消息到数据库
            Message userMessage = Message.builder()
                    .conversationId(conversationId)
                    .role("user")
                    .content(clientMsg.getContent())
                    .type("text")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            messageMapper.insertMessage(userMessage);
            
            // 生成助手响应消息ID
            String assistantMessageId = "msg_" + UUID.randomUUID().toString().replace("-", "");
            
            // 发送 message_start
            sendMessage(session, WebSocketServerMessageDto.builder()
                    .type("message_start")
                    .messageId(assistantMessageId)
                    .build());
            
            // 模拟流式响应（实际应接入AI服务）
            String fullResponse = "您好！我是智能助手。您的消息是：" + clientMsg.getContent() + 
                                "。我正在为您处理这个问题。";
            streamResponse(session, assistantMessageId, fullResponse);
            
            // 保存助手消息到数据库
            Message assistantMessage = Message.builder()
                    .conversationId(conversationId)
                    .role("assistant")
                    .content(fullResponse)
                    .type("text")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            messageMapper.insertMessage(assistantMessage);
            
            // 发送 message_end
            sendMessage(session, WebSocketServerMessageDto.builder()
                    .type("message_end")
                    .messageId(assistantMessageId)
                    .build());
            
        } catch (Exception e) {
            e.printStackTrace();
            sendError(session, null, "消息处理失败: " + e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        // 清理会话信息
        sessionConversationMap.remove(session.getId());
        sessionUserMap.remove(session.getId());
        System.out.println("WebSocket连接关闭: sessionId=" + session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        exception.printStackTrace();
        sessionConversationMap.remove(session.getId());
        sessionUserMap.remove(session.getId());
    }

    /**
     * 从URL路径中提取conversationId
     */
    private Long extractConversationId(String path) {
        try {
            // 路径格式: /v1/ws/conversations/{conversation_id}
            String[] parts = path.split("/");
            if (parts.length >= 5) {
                return Long.parseLong(parts[4]);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    /**
     * 验证WebSocket连接的JWT token
     */
    private Long authenticateSession(WebSocketSession session) {
        try {
            // 从查询参数获取token: ws://...?token=xxx
            String query = session.getUri().getQuery();
            if (query != null && query.startsWith("token=")) {
                String token = query.substring(6);
                // 移除可能的 Bearer 前缀
                if (token.startsWith("Bearer%20")) {
                    token = token.substring(9);
                } else if (token.startsWith("Bearer ")) {
                    token = token.substring(7);
                }
                return jwtUtil.getUserIdFromToken(token);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    /**
     * 流式发送响应内容
     */
    private void streamResponse(WebSocketSession session, String messageId, String content) throws Exception {
        // 模拟流式输出，每次发送几个字符
        int chunkSize = 5;
        for (int i = 0; i < content.length(); i += chunkSize) {
            int end = Math.min(i + chunkSize, content.length());
            String chunk = content.substring(i, end);
            
            sendMessage(session, WebSocketServerMessageDto.builder()
                    .type("message_delta")
                    .content(chunk)
                    .messageId(messageId)
                    .build());
            
            // 模拟延迟，实际使用时根据AI接口调整
            Thread.sleep(50);
        }
    }

    /**
     * 发送消息
     */
    private void sendMessage(WebSocketSession session, WebSocketServerMessageDto msg) throws IOException {
        String json = objectMapper.writeValueAsString(msg);
        session.sendMessage(new TextMessage(json));
    }

    /**
     * 发送错误消息
     */
    private void sendError(WebSocketSession session, String messageId, String error) {
        try {
            sendMessage(session, WebSocketServerMessageDto.builder()
                    .type("error")
                    .messageId(messageId)
                    .error(error)
                    .build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
