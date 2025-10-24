import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const app = express();
const buildPath = path.join(__dirname, 'build/client');

app.use(express.static(buildPath));

const port = 3000;
app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
