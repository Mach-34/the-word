import 'dotenv/config';
import cors from 'cors';
import express, { Express } from 'express';
import mongoose from 'mongoose';
import router from './router.js';

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use('/artifacts', express.static('src/artifacts'));
app.use(router);

mongoose
    .connect(process.env.MONGO_URL!, { dbName: process.env.DB_NAME! })
    .then(() => {
        console.log(`Connected to MongoDB database ${process.env.DB_NAME} at ${process.env.MONGO_URL}`);
        app.listen(process.env.PORT!, () => {
            console.log(`Server listening on port ${process.env.PORT}`);
        })
    })
    .catch((err) => { console.log(err) });