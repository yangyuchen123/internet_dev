package com.example.project.module.redis;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class TokenService {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    // 保存refresh token
    public void storeRefreshToken(String username, String refreshToken, long expireSeconds) {
        String key = "refreshToken:" + refreshToken;
        redisTemplate.opsForValue().set(key, username, expireSeconds, TimeUnit.SECONDS);
    }

    // 根据refresh token查询username
    public String getUsernameByRefreshToken(String refreshToken) {
        return redisTemplate.opsForValue().get("refreshToken:" + refreshToken);
    }

    // 删除refresh token
    public void deleteRefreshToken(String refreshToken) {
        redisTemplate.delete("refreshToken:" + refreshToken);
    }
}

//@Service
//public class TokenService {
//
//    @Autowired
//    private RedisTemplate<String, String> redisTemplate;
//
//    // 保存 refresh token
//    public void storeRefreshToken(String username, String refreshToken, long expireSeconds) {
//        String key = "refresh:" + username;
//        redisTemplate.opsForValue().set(key, refreshToken, expireSeconds, TimeUnit.SECONDS);
//    }
//
//    public boolean validateRefreshToken(String username, String refreshToken) {
//        String key = "refresh:" + username;
//        String stored = redisTemplate.opsForValue().get(key);
//        return refreshToken.equals(stored);
//    }
//
//    public void deleteRefreshToken(String username) {
//        redisTemplate.delete("refresh:" + username);
//    }
//
//    // 根据refreshToken获取用户名
//    public String getUsernameByRefreshToken(String refreshToken) {
//        Set<String> keys = redisTemplate.keys("refresh:*");
//        for (String key : keys) {
//            String value = redisTemplate.opsForValue().get(key);
//            if (refreshToken.equals(value)) {
//                return key.substring("refresh:".length());
//            }
//        }
//        return null;
//    }
//
//    // 删除旧 refresh token
//    public void deleteRefreshTokenByValue(String refreshToken) {
//        Set<String> keys = redisTemplate.keys("refresh:*");
//        for (String key : keys) {
//            String value = redisTemplate.opsForValue().get(key);
//            if (refreshToken.equals(value)) {
//                redisTemplate.delete(key);
//                break;
//            }
//        }
//    }
//}

