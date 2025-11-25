FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /workspace

COPY pom.xml .
COPY mvnw mvnw.cmd ./
COPY .mvn ./.mvn

RUN chmod +x mvnw && ./mvnw -B dependency:go-offline

COPY src ./src

RUN ./mvnw -B clean package -DskipTests

FROM eclipse-temurin:21-jre

LABEL maintainer="ai-agent-platform-backend"

WORKDIR /app

COPY --from=builder /workspace/target/project-*.jar /app/app.jar

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