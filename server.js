import express from 'express';
import Routing from './routes/index';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
Routing(app);

app.listen(port, () => console.log(`listening on port ${port}`));

export default app;
