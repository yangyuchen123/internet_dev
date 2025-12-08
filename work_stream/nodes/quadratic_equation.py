from typing import Dict, Any
import math
import re

def node_quadratic_equation(state: Dict[str, Any]):
    """解一元二次方程节点：ax² + bx + c = 0"""
    try:
        # 获取最后一条用户消息，消息格式应为："a,b,c" 或 "ax² + bx + c = 0"
        last_msg = state["messages"][-1][1] if isinstance(state["messages"][-1], tuple) else state["messages"][-1].content
        
        # 解析方程系数
        if "," in last_msg:
            # 格式："a,b,c"
            a, b, c = map(float, last_msg.strip().split(","))
        else:
            # 尝试解析 "ax² + bx + c = 0" 格式
            
            # 清理输入，去除所有空格以便更容易处理，并将 Unicode 平方符号替换为 x^2
            cleaned_msg = last_msg.replace(" ", "").lower().replace("²", "^2")
            
            # 首先，确保方程以=0结尾
            if not cleaned_msg.endswith("=0"):
                return {"messages": [("ai", "无法解析方程格式。请确保方程以 = 0 结尾。")]}
            
            # 去掉 "=0"
            equation_part = cleaned_msg[:-2]
            
            # 初始化系数
            a = 0.0
            b = 0.0
            c = 0.0
            
            # 处理二次项 (ax² 或 ax^2 或 ax2)
            quadratic_match = re.search(r'([+-]?\d*\.?\d*)x\^?2', equation_part)
            if quadratic_match:
                coeff_str = quadratic_match.group(1)
                if coeff_str == "" or coeff_str == "+":
                    a = 1.0
                elif coeff_str == "-":
                    a = -1.0
                else:
                    a = float(coeff_str)
                # 从方程中移除已处理的二次项
                equation_part = re.sub(r'([+-]?\d*\.?\d*)x\^?2', '', equation_part, 1)
            
            # 处理一次项 (bx)
            linear_match = re.search(r'([+-]?\d*\.?\d*)x(?!\^)', equation_part)  # (?!\^) 确保不是x^2
            if linear_match:
                coeff_str = linear_match.group(1)
                if coeff_str == "" or coeff_str == "+":
                    b = 1.0
                elif coeff_str == "-":
                    b = -1.0
                else:
                    b = float(coeff_str)
                # 从方程中移除已处理的一次项
                equation_part = re.sub(r'([+-]?\d*\.?\d*)x(?!\^)', '', equation_part, 1)
            
            # 处理常数项 (c)
            if equation_part:
                # 清理剩余部分，确保它是一个有效的数字
                constant_part = equation_part.strip()
                if constant_part:
                    if constant_part == "+":
                        c = 0.0
                    else:
                        c = float(constant_part)
            
            # 如果没有找到任何项，返回错误
            if a == 0 and b == 0 and c == 0:
                return {"messages": [("ai", "无法解析方程格式。请使用以下格式之一：\n1. a,b,c (如：1,-2,1)\n2. ax² + bx + c = 0 (如：x² - 2x + 1 = 0)")]}
        
        # 检查是否为二次方程
        if abs(a) < 1e-9:
            if abs(b) < 1e-9:
                if abs(c) < 1e-9:
                    return {"messages": [("ai", "方程有无数解，因为 0 = 0")]}
                else:
                    return {"messages": [("ai", "方程无解，因为 c ≠ 0")]}
            else:
                # 一次方程 bx + c = 0
                x = -c / b
                return {"messages": [("ai", f"这是一次方程，解为：x = {x:.6f}")]}
        
        # 计算判别式
        discriminant = b**2 - 4*a*c
        
        if discriminant > 1e-9:
            # 两个不同的实根
            root1 = (-b + math.sqrt(discriminant)) / (2*a)
            root2 = (-b - math.sqrt(discriminant)) / (2*a)
            return {"messages": [("ai", f"方程 {a}x² + {b}x + {c} = 0 的解为：\nx1 = {root1:.6f}\nx2 = {root2:.6f}")]}
        elif abs(discriminant) < 1e-9:
            # 一个重根
            root = -b / (2*a)
            return {"messages": [("ai", f"方程 {a}x² + {b}x + {c} = 0 有一个重根：x = {root:.6f}")]}
        else:
            # 两个共轭复根
            real_part = -b / (2*a)
            imaginary_part = math.sqrt(-discriminant) / (2*a)
            return {"messages": [("ai", f"方程 {a}x² + {b}x + {c} = 0 有两个共轭复根：\nx1 = {real_part:.6f} + {imaginary_part:.6f}i\nx2 = {real_part:.6f} - {imaginary_part:.6f}i")]}
            
    except ValueError as e:
        return {"messages": [("ai", f"解析错误：{str(e)}。请确保输入格式正确，例如：1,-2,1 或 x² - 2x + 1 = 0")]}
    except Exception as e:
        return {"messages": [("ai", f"计算错误：{str(e)}")]}
