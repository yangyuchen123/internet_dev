package com.example.project.module.user.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("role_permission")
public class RolePermission {

    private Long id;

    private Long roleId;        // 角色ID

    private Long permissionId;  // 权限ID

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDateTime createdAt;
}
