from typing import List, Dict


def normalize_scores(items: List[Dict], key: str) -> None:
    vals = [float(i.get(key, 0.0)) for i in items]
    if not vals:
        return
    mn, mx = min(vals), max(vals)
    rng = (mx - mn) or 1.0
    for i in items:
        i["_norm_" + key] = (float(i.get(key, 0.0)) - mn) / rng


def merge_results(vec_items: List[Dict], kw_items: List[Dict], alpha: float = 0.7, beta: float = 0.3) -> List[Dict]:
    # 归一化分数
    normalize_scores(vec_items, 'score_vec')
    # 对关键词检索简单给分：命中即 1.0（或可改为出现次数）
    for k in kw_items:
        if 'score_kw' not in k:
            k['score_kw'] = 1.0
    normalize_scores(kw_items, 'score_kw')

    by_id = {}
    def key_of(item):
        # 优先使用数据库 id，其次 content 文本哈希
        return item.get('id') or hash(item.get('content', ''))

    for v in vec_items:
        k = key_of(v)
        by_id[k] = dict(v)

    for w in kw_items:
        k = key_of(w)
        if k in by_id:
            # 合并字段
            merged = by_id[k]
            for kk, vv in w.items():
                if kk not in merged or not merged.get(kk):
                    merged[kk] = vv
            by_id[k] = merged
        else:
            by_id[k] = dict(w)

    # 计算融合分数
    res = []
    for item in by_id.values():
        sv = float(item.get('_norm_score_vec', 0.5)) 
        sk = float(item.get('_norm_score_kw', 0.0)) 
        score = alpha * sv + beta * sk
        item['score'] = float(score)
        res.append(item)

    # 降序排序
    res.sort(key=lambda x: x.get('score', 0.0), reverse=True)
    return res