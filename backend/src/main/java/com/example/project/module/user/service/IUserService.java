package com.example.project.module.user.service;

import com.example.project.module.user.dto.UserLoginDto;
import com.example.project.module.user.dto.UserRegisterDto;
import com.example.project.module.user.vo.RefreshVO;
import com.example.project.module.user.vo.UserLoginVO;
import jakarta.servlet.http.HttpServletResponse;

public interface IUserService {

    /**
     * 用户注册
     */
    void register(UserRegisterDto dto);

    /**
     * 用户登录
     */
    UserLoginVO login(UserLoginDto dto, HttpServletResponse response);

    /**
     * 刷新令牌
     */
    RefreshVO refresh(String refreshToken);
}
