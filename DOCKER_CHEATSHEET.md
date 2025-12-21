# Docker Workflow for CollabFlow

This guide contains the only commands you strictly need for daily development with the local PostgreSQL database.

## 🚀 Daily Routine

### Start the Database
```bash
docker compose up -d
```
**When to use:** At the start of your workday or before running the backend.
*   `-d`: Detached mode (runs in the background so it doesn't block your terminal).

### Stop the Database
```bash
docker compose down
```
**When to use:** When you are finished working and want to free up system resources.

---

## 🛠️ Troubleshooting & Management

### Check Status
```bash
docker compose ps
```
**When to use:** To verify if the database is actually running or if it crashed.

### View Logs
```bash
docker compose logs -f
```
**When to use:** If the database isn't connecting or behaving correctly.
*   `-f`: Follow (streams the logs live). Press `Ctrl+C` to exit.

### Reset Database (The "Nuclear" Option) ⚠️
```bash
docker compose down -v
```
**When to use:** When you want to **DELETE ALL DATA** and start fresh (e.g., after messing up a migration or populating bad data).
*   `-v`: Removes the named volumes where data is stored.

---

## 🔌 Direct Access (SQL)

### Connect via Terminal (psql)
```bash
docker exec -it collabflow-db psql -U collab -d collabflow
```
**When to use:** To run manual SQL queries, check table structures, or verify data without a GUI client.
*   `collabflow-db`: The container name defined in `docker-compose.yml`.
*   `-U collab`: Connect as user `collab`.
*   `-d collabflow`: Connect to database `collabflow`.

### 📜 Useful PSQL Commands (Once Connected)

Once you are inside the `psql` shell (`collabflow=#`), use these commands:

| Command | Description |
| :--- | :--- |
| `\dt` | **List all tables** in the current database. |
| `\d <table_name>` | **Describe a table** (show columns, types, keys). <br> *Example:* `\d users` |
| `SELECT * FROM <table>;` | **View data** (Standard SQL). <br> *Example:* `SELECT * FROM users LIMIT 5;` |
| `\x` | **Toggle "Expanded" display**. <br> Extremely useful for wide tables; shows columns vertically instead of horizontally. |
| `SELECT count(*) FROM <table>;`| **Count rows** in a table. |
| `\l` | **List all databases** on the server. |
| `\c <db_name>` | **Connect** to a different database. |
| `\du` | **List all users** (roles) and their permissions. |
| `\?` | **Show help** for psql commands. |
| `\q` | **Quit** / Exit the psql shell. |
