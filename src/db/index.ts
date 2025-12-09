


import { Pool, QueryResult } from 'pg';


// Use environment variables for secure connection details
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

pool.on('connect', () => {
    console.log('PostgreSQL client connected successfully.');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
});

// Export the pool query function
export default {
    query: (text: string, params?: any[]): Promise<QueryResult<any>> => pool.query(text, params),
};