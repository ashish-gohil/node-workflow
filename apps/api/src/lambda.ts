import serverless from 'serverless-http';
import app from './index.js'; 

export const handler = serverless(app);