package com.example.project.common.api;

import lombok.Getter;

@Getter
public enum ResultCode {
    SUCCESS(200, "操作成功"),
    FAIL(1, "操作失败"),

    UNAUTHORIZED(401, "未授权"),
    FORBIDDEN(403, "权限不足"),
    NOT_FOUND(404, "资源不存在"),

    PARAM_ERROR(400, "请求参数错误"),
    BUSINESS_ERROR(500, "服务器内部错误"),
    SYSTEM_ERROR(999, "系统错误");

    private final int code;
    private final String message;

    ResultCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
