from typing import List, Dict, Optional

import pymysql

try:
    from rag_service.config import DB_CONFIG
except ImportError:
    from config import DB_CONFIG


def get_conn():
    try:
        # 打印当前使用的数据库配置信息用于调试
        print(f"[DB Search Test] 使用数据库配置: 主机={DB_CONFIG['host']}, 端口={DB_CONFIG['port']}, 用户名={DB_CONFIG['user']}, 数据库={DB_CONFIG['database']}")
        
        conn = pymysql.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            charset='utf8mb4',
            autocommit=True
        )
        print(f"[DB Search Test] 数据库连接成功: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
        return conn
    except Exception as e:
        print(f"[DB Search Test] 数据库连接异常: {e}")
        return None


def like_search(question: str, category: Optional[str], topK: int, user: str = None) -> List[Dict]:
    sql = (
        "SELECT id, title, content, category, keywords, source, created_at "
        "FROM knowledge "
        "WHERE is_deleted=0 AND content LIKE %s "
        + (" AND category=%s" if category else "") +
        (" AND user=%s" if user else "") +
        " ORDER BY created_at DESC LIMIT %s"
    )
    params = [f"%{question}%"]
    if category:
        params.append(category)
    if user:
        params.append(user)
    params.append(topK)
    
    # 添加测试信息打印
    print(f"[DB Search Test] 执行查询 - 问题: '{question}', 分类: '{category}', 用户: '{user}', 限制数量: {topK}")
    print(f"[DB Search Test] SQL: {sql}")
    print(f"[DB Search Test] 参数: {params}")
    
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
                
                # 打印查询结果数量
                print(f"[DB Search Test] 查询到 {len(rows)} 条记录")
                
                # 打印前几条记录的简要信息（标题和ID）
                if rows:
                    print("[DB Search Test] 前3条记录:")
                    for i, r in enumerate(rows[:3]):
                        print(f"  [{i+1}] ID: {r[0]}, 标题: {r[1]}")
    except Exception as e:
        # 打印异常信息
        print(f"[DB Search Test] 数据库查询异常: {e}")
        # 数据库不可用时，返回空集合以保证服务可用
        rows = []
    
    res = []
    for r in rows:
        # tuple order must match select
        res.append({
            'id': r[0], 'title': r[1], 'content': r[2], 'category': r[3],
            'keywords': r[4], 'source': r[5], 'created_at': r[6]
        })
    
    # 打印最终返回的数据条数
    print(f"[DB Search Test] 返回 {len(res)} 条格式化数据")
    return res