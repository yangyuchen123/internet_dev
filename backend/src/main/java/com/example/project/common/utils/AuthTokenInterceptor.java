package com.example.project.common.utils;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 拦截器：从请求头读取 Authorization token 并放入 ThreadLocal，最后清理
 */
@Component
public class AuthTokenInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && !authHeader.isEmpty()) {
            // 支持 Bearer 前缀
            if (authHeader.startsWith("Bearer ")) {
                TokenContext.setToken(authHeader.substring(7));
            } else {
                TokenContext.setToken(authHeader);
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        TokenContext.clear();
    }
}

