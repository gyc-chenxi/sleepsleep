const express = require('express');
const neo4j = require('neo4j-driver');
const cors = require('cors');
const fs = require('fs'); // 导入文件系统模块
const path = require('path'); // 导入路径模块
// 创建 Express 应用
const app = express();
app.use(cors());
const PORT = 3000;

// 创建 Neo4j 数据库连接
const driver = neo4j.driver(
  'bolt://localhost:7687', // Neo4j 服务器地址
  neo4j.auth.basic('neo4j', 'cx031024') // Neo4j 的用户名和密码
);

// 路由定义
app.get('/api/type1', async (req, res) => {
  console.log('Received request for /api/type1');
  try {
    const data = await fetchTypeData('共现关系');
    console.log('Data to be returned:', JSON.stringify(data, null, 2)); // 打印返回的数据
    res.json(data);
  } catch (error) {
    console.error('Error in /api/type1:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/type2', async (req, res) => {
  console.log('Received request for /api/type2');
  try {
    const data = await fetchTypeData('关联关系');
    console.log('Data to be returned:', JSON.stringify(data, null, 2)); // 打印返回的数据
    res.json(data);
  } catch (error) {
    console.error('Error in /api/type2:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/type3', async (req, res) => {
  console.log('Received request for /api/type3');
  try {
    const data = await fetchTypeData('风险评估关系');
    console.log('Data to be returned:', JSON.stringify(data, null, 2)); // 打印返回的数据
    res.json(data);
  } catch (error) {
    console.error('Error in /api/type3:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/type4', async (req, res) => {
  console.log('Received request for /api/type4');
  try {
    const data = await fetchTypeData('诊断关系');
    console.log('Data to be returned:', JSON.stringify(data, null, 2)); // 打印返回的数据
    res.json(data);
  } catch (error) {
    console.error('Error in /api/type4:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/type5', async (req, res) => {
  console.log('Received request for /api/type5');
  try {
    const data = await fetchTypeData('建议适用关系');
    console.log('Data to be returned:', JSON.stringify(data, null, 2)); // 打印返回的数据
    res.json(data);
  } catch (error) {
    console.error('Error in /api/type5:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 新增的 /api/data 路由，返回所有类型的数据
app.get('/api/data', async (req, res) => {
  const diseaseName = req.query.disease;
  console.log(`Received request for /api/data with disease name: ${diseaseName}`);
  try {
    // 查询数据库，获取与输入疾病相关的所有节点和边
    const result = await fetchDataForDisease(diseaseName);
    console.log('Data for disease:', JSON.stringify(result, null, 2)); // 打印返回的数据
    res.json(result);
  } catch (error) {
    console.error('Error fetching data for disease:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// 新增的 /api/download 路由，保存数据为 JSON 文件并提供下载
app.get('/api/download', async (req, res) => {
  const diseaseName = req.query.disease;
  console.log(`Received request for /api/download with disease name: ${diseaseName}`);
  
  try {
    // 获取数据
    const result = await fetchDataForDisease(diseaseName);
    
    // 将数据保存为 JSON 文件
    const filePath = path.join(__dirname, `${diseaseName}-data.json`);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
    
    console.log(`Data saved to ${filePath}`);
    
    // 提供文件下载
    res.download(filePath, `${diseaseName}-data.json`, (err) => {
      if (err) {
        console.error('Error during file download:', err);
        res.status(500).send('Error downloading file');
      } else {
        console.log('File download initiated');
      }
    });
  } catch (error) {
    console.error('Error during /api/download:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// 查询特定类型的关系数据
async function fetchTypeData(type) {
  console.log(`Start fetching data for type: ${type}`);
  const session = driver.session();
  try {
    // 查询 Neo4j 数据库，获取特定类型关系的数据
    console.log(`Running Cypher query to fetch edges of type: ${type}`);
    const edgeResult = await session.run(
      `MATCH (n)-[r:${type}]->(m) RETURN id(n) AS startId, id(m) AS endId`
    );

    console.log(`Edge query result:`, edgeResult.records);

    const edges = edgeResult.records.map(record => ({
      startId: record.get('startId').toString(),
      endId: record.get('endId').toString()
    }));

    if (edges.length === 0) {
      console.log('No edges found for type:', type);
      return { nodes: [], edges: [] };
    }

    // 获取相关节点的 ID
    const nodeIds = [...new Set(edges.flatMap(edge => [edge.startId, edge.endId]))];
    console.log(`Node IDs to query: ${nodeIds.join(', ')}`);

    const nodeResult = await session.run(`
      MATCH (n)
      WHERE id(n) IN [${nodeIds.join(',')}]
      RETURN id(n) AS id, n.name AS name
    `);

    console.log('Node query result:', nodeResult.records);

    const nodes = nodeResult.records.map(record => ({
      id: record.get('id').toString(),
      name: record.get('name') || record.get('id').toString(),
    }));

    return { nodes, edges };
  } catch (error) {
    console.error('Error in fetchTypeData:', error);
    throw new Error('Error fetching data for type: ' + error.message);
  } finally {
    console.log('Closing Neo4j session');
    await session.close();
  }
}

// 查询与疾病相关的数据
async function fetchDataForDisease(diseaseName) {
  console.log(`Fetching data for disease: ${diseaseName}`);
  const session = driver.session();
  try {
    // 查询与疾病相关的关系
    const edgeResult = await session.run(
      `MATCH (disease:Entity {name: $diseaseName})-[r]->(related) RETURN id(disease) AS startId, id(related) AS endId`, 
      { diseaseName }
    );

    console.log(`Edge result for disease ${diseaseName}:`, edgeResult.records);

    const edges = edgeResult.records.map(record => ({
      startId: record.get('startId').toString(),
      endId: record.get('endId').toString(),
    }));

    if (edges.length === 0) {
      console.log(`No related edges found for disease: ${diseaseName}`);
      return { nodes: [], edges: [] };
    }

    // 获取相关节点的 ID
    const nodeIds = [...new Set(edges.flatMap(edge => [edge.startId, edge.endId]))];
    console.log(`Node IDs to query for disease ${diseaseName}: ${nodeIds.join(', ')}`);

    const nodeResult = await session.run(`
      MATCH (n)
      WHERE id(n) IN [${nodeIds.join(',')}]
      RETURN id(n) AS id, n.name AS name
    `);

    console.log(`Node result for disease ${diseaseName}:`, nodeResult.records);

    const nodes = nodeResult.records.map(record => ({
      id: record.get('id').toString(),
      name: record.get('name') || record.get('id').toString(),
    }));

    return { nodes, edges };
  } catch (error) {
    console.error('Error in fetchDataForDisease:', error);
    throw new Error('Error fetching data for disease: ' + error.message);
  } finally {
    console.log('Closing Neo4j session');
    await session.close();
  }
}

// 启动服务器并输出端口信息
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
