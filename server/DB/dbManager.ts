import sqlite3 from "sqlite3";
// Database connection
const db = new sqlite3.Database('./chuck_library.db');

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
