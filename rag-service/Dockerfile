FROM python:3.10

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements.txt并安装Python依赖
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools && \
    pip install --no-cache-dir -r requirements.txt

# 复制RAG服务代码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data/kb

# 设置环境变量
ENV PYTHONUNBUFFERED=1

# 暴露服务端口
EXPOSE 8000

# 启动命令
CMD ["python", "start_service.py"]