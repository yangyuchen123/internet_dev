package com.example.project.module.rag.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.URI;
import java.util.Enumeration;

@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
public class RagController {

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 代理转发所有 /api/rag/** 请求到 http://rag-service:8000/rag/**
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
     * 将 /api/rag/** 转换为 http://rag-service:8000/rag/**
     */
    private static String buildTargetUrl(HttpServletRequest request) {
        String requestUri = request.getRequestURI();

        // 计算 /api/rag 后面的真实路径
        String prefix = (request.getContextPath() == null ? "" : request.getContextPath()) + "/api/rag";
        String forwardPath = "/";
        if (requestUri.length() > prefix.length()) {
            forwardPath = requestUri.substring(prefix.length());
        }

        String queryString = request.getQueryString();
        return "http://rag-service:8000/rag" + forwardPath + (queryString == null ? "" : "?" + queryString);
    }
}
