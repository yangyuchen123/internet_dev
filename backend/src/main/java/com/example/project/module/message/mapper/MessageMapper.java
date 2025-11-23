package com.example.project.module.message.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.project.module.message.entity.Message;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MessageMapper extends BaseMapper<Message> {

    /**
     * 插入消息
     */
    void insertMessage(Message message);

}

