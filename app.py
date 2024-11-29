import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
from flask import Flask,render_template,request

app = Flask(__name__)


@app.route('/submit', methods=['POST'])
def submit():
    input_data = request.form['input_value']

    # 读取数据
    data = pd.read_csv('data.csv')
    print(data.head())

    # 合并实体名称和关联实体作为新的特征
    data['combined_features'] = data['实体名称'] + ' ' + data['关联实体']

    # 文本向量化
    vectorizer = TfidfVectorizer()
    X_vec = vectorizer.fit_transform(data['combined_features'])

    # 定义K-means模型并训练
    num_clusters = 750
    kmeans = KMeans(n_clusters=num_clusters, random_state=1024)
    kmeans.fit(X_vec)

    # 将聚类结果添加到数据中
    data['cluster'] = kmeans.labels_

    # 实现一个简单的编辑距离算法
    def levenshtein_distance(s1, s2):
        if len(s1) < len(s2):
            return levenshtein_distance(s2, s1)

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    # 修改后的预测函数，使用编辑距离进行模糊匹配
    def predict_associated_entity(entity_name, threshold=2):
        min_distance = float('inf')
        closest_entity = None
        associated_entities = None

        for index, row in data.iterrows():
            distance = levenshtein_distance(entity_name, row['实体名称'])
            if distance < min_distance:
                min_distance = distance
                closest_entity = row['实体名称']
                associated_entities = row['关联实体']

        if min_distance <= threshold:
            return associated_entities
        else:
            return "阻塞性睡眠呼吸暂停"

    # 预测实体名称
    test_entity = input_data
    predicted_entities = predict_associated_entity(test_entity)
    print(predicted_entities)

    # 这里将 `predicted_entities` 传递给模板
    return render_template("realhome.html", predicted_entities=predicted_entities)
@app.route("/")
def index():
    return render_template('home.html')
@app.route('/html/<filename>')
def html(filename):
    return render_template(filename)
def search():
    return render_template('search.html')
@app.route('/detail')
def detail():
    node_id = request.args.get('nodeId')
    node_name = request.args.get('nodeName')

    # 使用 node_id 和 node_name 查询数据库等操作
    return render_template('detail.html', nodeId=node_id, nodeName=node_name)

if __name__ == '__main__':
    app.run()
