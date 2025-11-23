package com.example.project.module.user.mapper;

import com.example.project.module.user.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserMapper {
    /**
     * 根据ID查询用户
     */
    User findById(@Param("id") Long id);

    /**
     * 根据用户名查询用户
     */
    User findByUsername(@Param("username") String username);

    /**
     * 查询所有用户
     */
    List<User> findAll();

    /**
     * 插入用户
     */
    void insert(User user);

    /**
     * 更新用户
     */
    void update(User user);

    /**
     * 删除用户（逻辑删除）
     */
    int deleteById(@Param("id") Long id);

    /**
     * 刷新令牌
     */
    void refresh(Long id, String token);
}
