import 'dotenv/config';
import cors from 'cors';
import express, { Express } from 'express';
import mongoose from 'mongoose';
import router from './router.js';
import fs from 'fs';
import http from 'http';
import https from 'https';

const app: Express = express();

app.use(cors({ origin: 'http://localhost:3004', credentials: true }));
app.use(express.json());
app.use('/artifacts', express.static('src/artifacts'));
app.use(router);

mongoose
    .connect(process.env.MONGO_URL!, { dbName: process.env.DB_NAME! })
    .then(() => {
        console.log(`Connected to MongoDB database ${process.env.DB_NAME} at ${process.env.MONGO_URL}`);
        if (process.env.PRODUCTION === "true") {
            // load ssl certificate
            const certDir = process.env.CERT_DIR!;
            const credentials = {
                key: fs.readFileSync(`${certDir}/privkey.pem`, 'utf8'),
                cert: fs.readFileSync(`${certDir}/fullchain.pem`, 'utf8')
            };
            // http app listener
            const httpServer = http.createServer(app);
            httpServer.listen(80);
            console.log(`Server listening for http on port 80`)

            // https app listener
            const httpsServer = https.createServer(credentials, app);
            httpsServer.listen(443);
            console.log(`Server listening for https on port 443`);
        } else {
            app.listen(process.env.PORT!, () => {
                console.log(`Server listening on port ${process.env.PORT}`);
            })
        }
    })
    .catch((err) => { console.log(err) });