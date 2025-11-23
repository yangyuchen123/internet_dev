package com.example.project.config;

import com.example.project.common.utils.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

/**
 * JWT认证过滤器
 * 从请求头中提取JWT token，验证后设置到Spring Security上下文中
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        // 打印请求信息，便于调试
        logger.info("请求路径: " + request.getMethod() + " " + request.getRequestURI());
        
        // 从请求头获取token
        String authHeader = request.getHeader("Authorization");
        logger.info("Authorization Header: " + authHeader);
        
        String token = null;
        
        // 支持两种格式：带 Bearer 前缀和不带前缀
        if (authHeader != null && !authHeader.isEmpty()) {
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            } else {
                // 兼容不带 Bearer 前缀的情况
                token = authHeader;
            }
        }
        
        if (token != null) {
            try {
                // 验证并解析token
                Long userId = jwtUtil.getUserIdFromToken(token);
                logger.info("从token解析出用户ID: " + userId);
                
                // 如果token有效且当前SecurityContext中没有认证信息
                if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    // 创建认证对象
                    UsernamePasswordAuthenticationToken authentication = 
                        new UsernamePasswordAuthenticationToken(
                            userId,  // principal: 用户ID
                            null,    // credentials: 不需要密码
                            new ArrayList<>()  // authorities: 权限列表（暂时为空）
                        );
                    
                    // 设置详细信息
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    
                    // 将认证信息设置到Spring Security上下文中
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    logger.info("认证成功，用户ID: " + userId);
                }
            } catch (Exception e) {
                // token无效或过期，不设置认证信息
                logger.warn("JWT token验证失败: " + e.getMessage());
            }
        } else {
            logger.warn("未找到有效的Authorization header");
        }
        
        // 继续过滤器链
        filterChain.doFilter(request, response);
    }
}
