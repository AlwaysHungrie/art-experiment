import express from 'express' 
import cors from 'cors' 
import { config } from './config' 

import router from './routes';

const app = express();

app.use(cors());
app.use(express.json()); 

app.get("/health", (_, res) => {
	res.json({
		message: "OK"
	});
});

app.use("/api", router); 

app.listen(config.PORT, () => {
	console.log(`Server is running on port ${config.PORT}`);
});

