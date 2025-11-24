FROM eclipse-temurin:25-jre-ubi10-minimal

LABEL maintainer="ai-agent-platform-backend"

# 创建应用目录
RUN mkdir -p /app
WORKDIR /app

# 复制 JAR 包
# 注意：这里假设 target 目录下只有一个主 JAR 包，或者指定具体名称
COPY target/project-*.jar /app/
RUN mv /app/project-*.jar /app/app.jar || true && rm -f /app/*.original

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Java 运行参数
ENV JAVA_OPTS="-Xms512m -Xmx1g -Djava.security.egd=file:/dev/./urandom"
ENV SPRING_OPTS=""

# 暴露端口
EXPOSE 8080

# 启动命令
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar $SPRING_OPTS"]