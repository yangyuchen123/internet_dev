import pymysql
import os

# 读取SQL脚本内容
def read_sql_script(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

# 执行SQL脚本
def execute_sql_script(script_path):
    try:
        # 数据库连接参数
        conn_params = {
            'host': 'localhost',
            'port': 3306,
            'user': 'demo_user',
            'password': 'demo_pass_123',
            'charset': 'utf8mb4'
        }
        
        # 读取SQL脚本
        sql_content = read_sql_script(script_path)
        print(f"成功读取SQL脚本，长度: {len(sql_content)} 字符")
        
        # 连接数据库
        print("正在连接数据库...")
        conn = pymysql.connect(**conn_params)
        cursor = conn.cursor()
        
        # 执行SQL脚本（按分号分割）
        print("正在执行SQL脚本...")
        sql_commands = sql_content.split(';')
        for command in sql_commands:
            command = command.strip()
            if command:
                print(f"执行: {command[:50]}...")
                cursor.execute(command)
        
        # 提交事务
        conn.commit()
        print("✅ SQL脚本执行成功！")
        
        # 验证表是否创建成功
        cursor.execute("USE demo_db;")
        cursor.execute("SHOW TABLES LIKE 'knowledge';")
        tables = cursor.fetchall()
        if tables:
            print("✅ knowledge表已成功创建！")
            
            # 检查数据是否插入成功
            cursor.execute("SELECT COUNT(*) FROM knowledge;")
            count = cursor.fetchone()[0]
            print(f"✅ knowledge表中有 {count} 条数据")
        else:
            print("❌ knowledge表创建失败")
            
    except Exception as e:
        print(f"❌ 执行失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    execute_sql_script('create_knowledge_table.sql')