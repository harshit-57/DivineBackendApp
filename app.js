import express from "express";
import Routes from "./routes/routes.js";
import bodyParser from 'body-parser';

export class App {

  constructor() {

    this.app = express();
    this.app.use(bodyParser.json({limit: '1000mb'}));
    this.app.use(bodyParser.urlencoded({limit: '1000mb', extended: true}));
    this.app.use(express.json({ limit:  '1000mb' }));
    this.app.use(express.urlencoded({ limit:  '1000mb', extended: true }));
    Routes.init(this);
  }
}

export default new App().app;
