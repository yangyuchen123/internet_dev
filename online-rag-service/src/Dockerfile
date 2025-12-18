FROM python:3.10-slim

# 设置非root用户
RUN useradd -m appuser
USER appuser

# 设置工作目录
WORKDIR /app

# 安装系统依赖
# USER root
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     gcc \
#     libgomp1 \
#     && rm -rf /var/lib/apt/lists/*
USER appuser

# 设置Python环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/home/appuser/.local/bin:$PATH"

# 复制requirements.txt并安装Python依赖
COPY requirements.txt .
RUN pip install --upgrade pip setuptools && \
    pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/ --trusted-host pypi.tuna.tsinghua.edu.cn

# 复制RAG服务代码
COPY --chown=appuser:appuser . .

# 暴露服务端口
EXPOSE 8000

# 启动命令
CMD ["python", "start_service.py"]