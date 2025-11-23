package com.example.project.module.agent.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("agent")
public class Agent {

    private Long id;

    private String name;

    private String description;

    private String avatar;

    private String category;

    private String model;

    private String systemPrompt;

    private BigDecimal temperature = BigDecimal.valueOf(0.7);

    private Integer maxTokens = 2000;

    private Boolean isPublic = false;

    private Long creatorId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

}
