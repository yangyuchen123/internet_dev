package com.example.project.common.utils;

import com.example.project.common.exceptions.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.LocalDateTime;

/**
 * 管理员插入辅助类，可复用来向 `admin` 表插入管理员记录。
 * 使用方法：在需要的地方注入 AdminSeeder，然后调用 insertAdmin(...)。
 * 示例：adminSeeder.insertAdmin("testadmin", "123456");
 * 注意：该类只会向 `admin` 表插入下列字段：
 *  username, password, nickname, status, last_login_time, created_at, updated_at, is_deleted
 * 如果你的 `admin` 表有额外的必填字段，请在调用前或扩展此类时补充这些字段。
 */
@Component
@RequiredArgsConstructor
public class AdminSeeder {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    /**
     * 将管理员插入 `admin` 表（如果 username 已存在则抛出 BusinessException）。
     *
     * @param username 管理员用户名
     * @param rawPassword 未加密的密码，方法内部会使用项目的 PasswordEncoder 加密后写入
     */
    public void insertAdmin(String username, String rawPassword) {
        // 检查是否已存在
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM admin WHERE username = ?",
                Integer.class,
                username
        );
        if (count != null && count > 0) {
            throw new BusinessException("管理员用户名已存在: " + username);
        }

        String encoded = passwordEncoder.encode(rawPassword);
        String nickname = username;
        int status = 1;
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());
        int isDeleted = 0;

        String sql = "INSERT INTO admin (username, password, nickname, status, last_login_time, created_at, updated_at, is_deleted) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        int updated = jdbcTemplate.update(sql, username, encoded, nickname, status, now, now, now, isDeleted);
        if (updated != 1) {
            throw new BusinessException("插入管理员失败，影响行数: " + updated);
        }
    }
}
