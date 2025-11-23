package com.example.project.module.message.dto;

import lombok.Data;

import java.util.Map;

@Data
public class SendMessageDto {

    private String content;

    private String type;

    private Map<String, Object> metadata;
}
