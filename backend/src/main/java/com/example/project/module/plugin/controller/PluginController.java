package com.example.project.module.plugin.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.net.URI;
import java.util.Enumeration;

@RestController
@RequestMapping("/api/plugin")
@RequiredArgsConstructor
public class PluginController {

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 代理转发所有 /api/plugin/** 请求到 http://plugin-server:3000/**
     */
    @RequestMapping("/**")
    public ResponseEntity<byte[]> proxy(HttpServletRequest request) throws IOException {
        String target = buildTargetUrl(request);

        // 复制请求头
        HttpHeaders headers = new HttpHeaders();
        Enumeration<String> headerNames = request.getHeaderNames();
        if (headerNames != null) {
            while (headerNames.hasMoreElements()) {
                String name = headerNames.nextElement();
                if ("host".equalsIgnoreCase(name)) continue;
                Enumeration<String> values = request.getHeaders(name);
                while (values.hasMoreElements()) {
                    headers.add(name, values.nextElement());
                }
            }
        }

        // 读取请求体
        byte[] body = StreamUtils.copyToByteArray(request.getInputStream());

        // 构造并发送请求
        HttpMethod method;
        try {
            method = HttpMethod.valueOf(request.getMethod());
        } catch (IllegalArgumentException e) {
            method = HttpMethod.POST;
        }

        RequestEntity<byte[]> forwardRequest =
                new RequestEntity<>(body, headers, method, URI.create(target));

        ResponseEntity<byte[]> responseEntity =
                restTemplate.exchange(forwardRequest, byte[].class);

        // 复制响应头（过滤不合适的头）
        HttpHeaders responseHeaders = new HttpHeaders();
        responseEntity.getHeaders().forEach((k, v) -> {
            if (k == null) return;
            if ("transfer-encoding".equalsIgnoreCase(k) || "content-length".equalsIgnoreCase(k)) return;
            responseHeaders.put(k, v);
        });

        return new ResponseEntity<>(responseEntity.getBody(), responseHeaders, responseEntity.getStatusCode());
    }

    /**
     * 将 /api/plugin/** 转换为 http://plugin-server:3000/**
     */
    private static String buildTargetUrl(HttpServletRequest request) {
        String requestUri = request.getRequestURI();

        // 计算 /api/plugin 后面的真实路径
        String prefix = (request.getContextPath() == null ? "" : request.getContextPath()) + "/api/plugin";
        String forwardPath = "/";
        if (requestUri.length() > prefix.length()) {
            forwardPath = requestUri.substring(prefix.length());
        }

        String queryString = request.getQueryString();
        return "http://plugin-server:3000" + forwardPath + (queryString == null ? "" : "?" + queryString);
    }
}
