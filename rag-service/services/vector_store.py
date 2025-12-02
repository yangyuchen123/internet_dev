import json
import os
import threading
from typing import Dict, List, Any, Optional

import faiss
import numpy as np


class VectorStore:
    def __init__(self, embedder, index_path: str, meta_path: str):
        self.embedder = embedder
        self.index_path = index_path
        self.meta_path = meta_path
        self.lock = threading.Lock()
        self.index = None
        self.meta: List[Dict[str, Any]] = []

        self._ensure_dirs()
        self._load()

    def _ensure_dirs(self):
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        os.makedirs(os.path.dirname(self.meta_path), exist_ok=True)

    def _load(self):
        dim = self.embedder.dimension()
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            self.index = faiss.IndexFlatIP(dim)

        if os.path.exists(self.meta_path):
            with open(self.meta_path, 'r', encoding='utf-8') as f:
                self.meta = json.load(f)
        else:
            self.meta = []

    def save(self):
        #需在锁保护下调用
        try:
            print(f"[VectorStore] 开始保存数据...")
            print(f"[VectorStore] 保存向量索引到: {os.path.abspath(self.index_path)}")
            
            # 确保目录存在
            os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
            os.makedirs(os.path.dirname(self.meta_path), exist_ok=True)
            
            try:
                # 保存向量索引
                faiss.write_index(self.index, self.index_path)
                print(f"[VectorStore] 向量索引保存完成")
            except Exception as e:
                print(f"[VectorStore] 保存向量索引失败: {type(e).__name__}: {str(e)}")
                raise
            
            print(f"[VectorStore] 保存元数据到: {os.path.abspath(self.meta_path)}")
            print(f"[VectorStore] 元数据记录数量: {len(self.meta)}")
            
            try:
                # 保存元数据
                with open(self.meta_path, 'w', encoding='utf-8') as f:
                    json.dump(self.meta, f, ensure_ascii=False, indent=2)
                print(f"[VectorStore] 元数据保存完成")
            except Exception as e:
                print(f"[VectorStore] 保存元数据失败: {type(e).__name__}: {str(e)}")
                
                # 检查是否是JSON序列化问题
                if len(self.meta) > 0:
                    try:
                        # 测试元数据是否可以序列化
                        test_json = json.dumps(self.meta[0], ensure_ascii=False)
                        print(f"[VectorStore] 第一条元数据序列化测试成功: {test_json[:100]}...")
                    except Exception as json_e:
                        print(f"[VectorStore] 元数据序列化测试失败: {type(json_e).__name__}: {str(json_e)}")
                        print(f"[VectorStore] 问题元数据: {self.meta[0]}")
                raise
            
            # 验证保存是否成功
            if os.path.exists(self.index_path):
                index_size = os.path.getsize(self.index_path) / 1024 / 1024  # 转换为MB
                print(f"[VectorStore] 向量索引保存成功，文件大小: {index_size:.2f} MB")
            else:
                print(f"[VectorStore] 警告: 向量索引文件不存在")
            
            if os.path.exists(self.meta_path):
                meta_size = os.path.getsize(self.meta_path) / 1024  # 转换为KB
                print(f"[VectorStore] 元数据保存成功，文件大小: {meta_size:.2f} KB")
            else:
                print(f"[VectorStore] 警告: 元数据文件不存在")
                
            print(f"[VectorStore] 保存操作完全成功完成")
                
        except Exception as e:
            print(f"[VectorStore] save函数出现问题: {type(e).__name__}: {str(e)}")
            # 检查是否是权限问题
            if not os.access(os.path.dirname(self.index_path), os.W_OK):
                print(f"[VectorStore] 权限错误: 无法写入索引目录: {os.path.dirname(self.index_path)}")
            if not os.access(os.path.dirname(self.meta_path), os.W_OK):
                print(f"[VectorStore] 权限错误: 无法写入元数据目录: {os.path.dirname(self.meta_path)}")
            # 检查是否是磁盘空间问题
            try:
                statvfs = os.statvfs(os.path.dirname(self.index_path))
                free_space = statvfs.f_bavail * statvfs.f_frsize / (1024 * 1024 * 1024)  # GB
                print(f"[VectorStore] 磁盘可用空间: {free_space:.2f} GB")
            except Exception as disk_e:
                print(f"[VectorStore] 无法获取磁盘空间信息: {disk_e}")
            raise

    def count(self) -> int:
        try:
            return int(self.index.ntotal)
        except Exception:
            return len(self.meta)

    def add_texts(self, texts: List[str], metas: List[Dict[str, Any]]):
        assert len(texts) == len(metas), 'texts 与 metas 长度需一致'
        
        # 记录数据存储的详细信息
        print(f"[VectorStore] 开始添加数据: {len(texts)} 条记录")
        print(f"[VectorStore] 向量维度: {self.embedder.dimension()}")
        print(f"[VectorStore] 索引文件路径: {os.path.abspath(self.index_path)}")
        print(f"[VectorStore] 元数据文件路径: {os.path.abspath(self.meta_path)}")
        
        # 记录部分元数据样例用于调试
        if metas:
            print(f"[VectorStore] 元数据示例: {json.dumps(metas[0], ensure_ascii=False, indent=2)}")
            if len(metas) > 1:
                print(f"[VectorStore] 最后一条元数据示例: {json.dumps(metas[-1], ensure_ascii=False, indent=2)}")
        
        vecs = self.embedder.encode(texts)
        vecs = np.asarray(vecs, dtype='float32')
        
        with self.lock:
            # 记录添加前的索引大小
            before_count = self.index.ntotal
            self.index.add(vecs)
            self.meta.extend(metas)
            # 记录添加后的索引大小
            after_count = self.index.ntotal
            print(f"[VectorStore] 索引更新: 从 {before_count} 条增加到 {after_count} 条记录")
        
            # 保存更改
            print(f"[VectorStore] 保存更改")
            self.save()
            print(f"[VectorStore] 数据已保存到磁盘")

    def search(self, q: str, topK: int = 5, category: Optional[str] = None):
        qv = self.embedder.encode([q])
        qv = np.asarray(qv, dtype='float32')
        D, I = self.index.search(qv, topK)
        res = []
        for score, idx in zip(D[0].tolist(), I[0].tolist()):
            if idx < 0 or idx >= len(self.meta):
                continue
            item = dict(self.meta[idx])
            if category and item.get('category') and item.get('category') != category:
                continue
            item['score_vec'] = float(score)
            res.append(item)
        return res
    
    def delete_by_title(self, title: str) -> int:
        """
        根据标题删除向量库中的内容
        
        Args:
            title: 要删除的标题
            
        Returns:
            删除的记录数量
        """
        print(f"[VectorStore] 开始删除标题为 '{title}' 的记录")
        if not title:
            print(f"[VectorStore] 标题为空，不执行删除")
            return 0
            
        with self.lock:
            print(f"[VectorStore] 获取锁成功，当前元数据数量: {len(self.meta)}")
            # 记录删除前的数量
            before_count = len(self.meta)
            
            # 打印匹配的标题记录
            matching_titles = [item.get('title') for item in self.meta if item.get('title') == title]
            print(f"[VectorStore] 找到匹配的标题记录数量: {len(matching_titles)}")
            
            # 过滤出不匹配标题的记录
            self.meta = [item for item in self.meta if item.get('title') != title]
            
            # 重建FAISS索引
            print(f"[VectorStore] 开始重建FAISS索引，剩余记录数: {len(self.meta)}")
            dim = self.embedder.dimension()
            new_index = faiss.IndexFlatIP(dim)
            
            # 如果还有剩余数据，重建索引
            if len(self.meta) > 0:
                texts = [item.get('content', '') for item in self.meta]
                print(f"[VectorStore] 编码 {len(texts)} 个文本")
                vecs = self.embedder.encode(texts)
                vecs = np.asarray(vecs, dtype='float32')
                new_index.add(vecs)
                print(f"[VectorStore] 索引添加完成")
            
            self.index = new_index
            
            # 保存更改
            print(f"[VectorStore] 保存更改")
            self.save()
            
            # 计算删除的数量
            deleted_count = before_count - len(self.meta)
            print(f"[VectorStore] 已删除标题为 '{title}' 的 {deleted_count} 条记录")
            return deleted_count
    
    def delete_by_category(self, category: str) -> int:
        """
        根据类别删除向量库中的内容
        
        Args:
            category: 要删除的类别
            
        Returns:
            删除的记录数量
        """
        print(f"[VectorStore] 开始删除类别为 '{category}' 的记录")
        if not category:
            print(f"[VectorStore] 类别为空，不执行删除")
            return 0
            
        with self.lock:
            print(f"[VectorStore] 获取锁成功，当前元数据数量: {len(self.meta)}")
            # 记录删除前的数量
            before_count = len(self.meta)
            
            # 打印匹配的类别记录
            matching_categories = [item.get('category') for item in self.meta if item.get('category') == category]
            print(f"[VectorStore] 找到匹配的类别记录数量: {len(matching_categories)}")
            
            # 过滤出不匹配类别的记录
            self.meta = [item for item in self.meta if item.get('category') != category]
            
            # 重建FAISS索引
            print(f"[VectorStore] 开始重建FAISS索引，剩余记录数: {len(self.meta)}")
            dim = self.embedder.dimension()
            new_index = faiss.IndexFlatIP(dim)
            
            # 如果还有剩余数据，重建索引
            if len(self.meta) > 0:
                texts = [item.get('content', '') for item in self.meta]
                print(f"[VectorStore] 编码 {len(texts)} 个文本")
                vecs = self.embedder.encode(texts)
                vecs = np.asarray(vecs, dtype='float32')
                new_index.add(vecs)
                print(f"[VectorStore] 索引添加完成")
            
            self.index = new_index
            
            # 保存更改
            print(f"[VectorStore] 保存更改")
            self.save()
            
            # 计算删除的数量
            deleted_count = before_count - len(self.meta)
            print(f"[VectorStore] 已删除类别为 '{category}' 的 {deleted_count} 条记录")
            return deleted_count