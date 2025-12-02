package com.example.project.module.test.TestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 测试控制器
 */
@Tag(name = "消息管理")
@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController {

    @GetMapping("/ping")
    public String ping() {
        return "pong";
    }

}
