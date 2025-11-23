package com.example.project.module.user.controller;

import com.example.project.common.api.ApiResponse;
import com.example.project.module.user.dto.UserLoginDto;
import com.example.project.module.user.dto.UserRegisterDto;
import com.example.project.module.user.service.IUserService;
import com.example.project.module.user.vo.RefreshVO;
import com.example.project.module.user.vo.UserLoginVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * 用户控制器
 */
@Tag(name = "用户管理", description = "用户注册、登录等接口")
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final IUserService userService;

    @Operation(summary = "用户注册")
    @PostMapping("/register")
    public ApiResponse<Void> register(@Validated @RequestBody UserRegisterDto dto) {
        userService.register(dto);
        return ApiResponse.ok();
    }

    @Operation(summary = "用户登录")
    @PostMapping("/login")
    public ApiResponse<UserLoginVO> login(@Validated @RequestBody UserLoginDto dto, HttpServletResponse response) {
        UserLoginVO userLoginVO = userService.login(dto, response);
        return ApiResponse.ok("登录成功", userLoginVO);
    }

    @Operation(summary = "刷新令牌")
    @PostMapping("/refresh")
    public ApiResponse<RefreshVO> refresh(
            @CookieValue(value = "refreshToken", required = false) String cookieRefreshToken,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String refreshToken = cookieRefreshToken;
        if (refreshToken == null && body != null) {
            // 支持 JSON 字段名 refresh_token 或 refreshToken
            refreshToken = body.getOrDefault("refresh_token", body.get("refreshToken"));
        }
        if (refreshToken == null) {
            return ApiResponse.fail("缺少 refresh_token");
        }
        RefreshVO refreshVO = userService.refresh(refreshToken);
        return ApiResponse.ok("刷新令牌成功", refreshVO);
    }


}
