import sqlite3 from "sqlite3";
import {fileURLToPath} from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// console.log(path.join( __dirname, '../../chuck_library.db'));
// Database connection
const db = new sqlite3.Database(path.join( __dirname, '../../chuck_library.db'));

// Promisify db operations
export const dbRun = (sql: string, params:any[] = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(this: {lastID: number, changes: number}, err: any) {
        if (err) return reject(err);
        resolve({id: this.lastID, changes: this.changes});
    });
});

export const dbAll = (sql: string, params:any[] = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err: any, rows: any) => {
        if (err) return reject(err);
        resolve(rows);
    });
});

export const dbGet = (sql: string, params:any[] = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err: any, row: any) => {
        if (err) return reject(err);
        resolve(row);
    });
});
