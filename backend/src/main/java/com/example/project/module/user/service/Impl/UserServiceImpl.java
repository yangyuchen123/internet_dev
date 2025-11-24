package com.example.project.module.user.service.Impl;

import com.example.project.common.exceptions.BusinessException;
import com.example.project.common.utils.JwtUtil;
import com.example.project.module.user.dto.UserLoginDto;
import com.example.project.module.user.dto.UserRegisterDto;
import com.example.project.module.user.entity.User;
import com.example.project.module.user.mapper.UserMapper;
import com.example.project.module.user.service.IUserService;
import com.example.project.module.user.vo.RefreshVO;
import com.example.project.module.user.vo.UserLoginVO;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.servlet.http.Cookie;

import java.time.LocalDateTime;

/**
 * 用户服务实现类
 */
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements IUserService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    // private  final TokenService tokenService;

    /**
     * 用户注册功能实现
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void register(UserRegisterDto dto) {
        // 检查用户是否存在
        User existUser = userMapper.findByUsername(dto.getUsername());
        if (existUser != null) {
            throw new BusinessException("用户名已存在");
        }

        // 创建用户
        User user = new User();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setNickname(dto.getUsername());
        user.setEmail(dto.getEmail());
        user.setAvatar("https://example.com/avatar.jpg");
        user.setStatus(1);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        userMapper.insert(user);
    }

    @Override
    public UserLoginVO login(UserLoginDto dto, HttpServletResponse response) {
        User user = userMapper.findByUsername(dto.getUsername());

        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        if (user.getIsDeleted() == 1) {
            throw new BusinessException("用户已被删除");
        }

        if (user.getStatus() == 0) {
            throw new BusinessException("账号已被禁用");
        }

        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new BusinessException("密码错误");
        }

        // 生成access token
        String accessToken = jwtUtil.generateAccessToken(user.getId());

        // 生成refresh token
        String refreshToken = jwtUtil.generateRefreshToken();

        // 将refresh token存Redis（7天过期）
        // JwtUtil.REFRESH_TOKEN_EXPIRE 现在以秒为单位
        // tokenService.storeRefreshToken(user.getUsername(), refreshToken, (int)JwtUtil.REFRESH_TOKEN_EXPIRE);

        // 将refresh token设置为httpOnly cookie
        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        // 本地开发环境通常使用 http，secure=true 会导致 cookie 不被发送；生产环境请改回 true
        cookie.setSecure(false);
        // 允许刷新接口路径访问，使用根路径保证路径通配
        cookie.setPath("/");
        cookie.setMaxAge((int)JwtUtil.REFRESH_TOKEN_EXPIRE);
        response.addCookie(cookie);

        // 更新最后登录时间
        user.setLastLoginTime(LocalDateTime.now());
        userMapper.update(user);

        // 构建返回对象
        return UserLoginVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatar(user.getAvatar())
                .gender(user.getGender())
                .birthday(user.getBirthday())
                .lastLoginTime(user.getLastLoginTime())
                .access_token(accessToken)
                .refresh_token(refreshToken)
                .build();
    }

    @Override
    public RefreshVO refresh(String refreshToken) {
        // 验证Redis中是否存在refreshToken
        // String username = tokenService.getUsernameByRefreshToken(refreshToken);
        // if (username == null) {
        //     throw new RuntimeException("refresh_token无效或已过期");
        // }
        throw new BusinessException("Refresh token function is disabled (Redis removed)");

        /*
        Long userId = userMapper.findByUsername(username).getId();

        // 生成新的access_token
        String newAccessToken = jwtUtil.generateAccessToken(userId);

        // 生成新的refresh_token
        String newRefreshToken = jwtUtil.generateRefreshToken();

        // 更新 Redis
        tokenService.storeRefreshToken(username, newRefreshToken, (int)JwtUtil.REFRESH_TOKEN_EXPIRE); // 7天（秒）
        tokenService.deleteRefreshToken(refreshToken); // 删除旧refresh_token

        User user = userMapper.findByUsername(username);

        // 构建返回对象
        return RefreshVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatar(user.getAvatar())
                .gender(user.getGender())
                .birthday(user.getBirthday())
                .lastLoginTime(user.getLastLoginTime())
                .access_token(newAccessToken)
                .refresh_token(newRefreshToken)
                .build();
        */
    }
}
