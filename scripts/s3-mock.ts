import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

const app = express();
const port = 3900;
const MOCK_STORAGE = path.join(process.cwd(), '.mock-s3');

// Ensure storage exists
if (!fs.existsSync(MOCK_STORAGE)) fs.mkdirSync(MOCK_STORAGE, { recursive: true });

app.use(express.raw({ type: '*/*', limit: '10mb' }));

// Manual handling to avoid path-to-regexp issues in Express 5
app.use((req, res) => {
	const key = req.path;
	const method = req.method;

	console.log(`[MOCK S3] ${method} ${req.path}`);

	if (method === 'HEAD') {
		res.status(200).end();
	} else if (method === 'PUT') {
		const fullPath = path.join(MOCK_STORAGE, key);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, req.body);
		res.status(200).end();
	} else if (method === 'GET') {
		const fullPath = path.join(MOCK_STORAGE, key);
		if (fs.existsSync(fullPath)) {
			res.send(fs.readFileSync(fullPath));
		} else {
			res.status(404).end();
		}
	} else {
		res.status(200).end();
	}
});

app.listen(port, '127.0.0.1', () => {
	console.log(`[+] S3 Mock active on http://127.0.0.1:${port}`);
});
