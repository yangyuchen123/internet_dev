package com.example.project.module.user.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_role")
public class UserRole {

    private Long id;

    private Long userId;  // 用户ID

    private Long roleId;  // 角色ID

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDateTime createdAt;
}
