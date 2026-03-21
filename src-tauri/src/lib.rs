use tokio::sync::Mutex;
use rusqlite::Connection;
use tokio_postgres::Client as PgClient;

// ─── Shared state ─────────────────────────────────────────────────────────────

/// Which database engine is currently connected.
pub enum ActiveDb {
    Sqlite(Connection),
    Postgres(PgClient),
}

/// Application-wide state wrapped in a tokio async Mutex so commands can be async.
pub struct DbState(pub Mutex<Option<ActiveDb>>);

// ─── Types returned to the frontend ───────────────────────────────────────────

#[derive(serde::Serialize, Clone)]
pub struct ColumnInfo {
    pub name:     String,
    #[serde(rename = "type")]
    pub col_type: String,
    pub nullable: bool,
    pub pk:       bool,
    pub fk:       bool,
    pub fk_table: Option<String>,
}

#[derive(serde::Serialize, Clone)]
pub struct TableSchema {
    pub id:      String,
    pub name:    String,
    pub columns: Vec<ColumnInfo>,
}

#[derive(serde::Serialize)]
pub struct QueryResult {
    pub columns:       Vec<String>,
    pub rows:          Vec<Vec<serde_json::Value>>,
    pub rows_affected: usize,
    pub exec_ms:       f64,
}

// ─── SQLite helpers ────────────────────────────────────────────────────────────

fn sqlite_get_schema(conn: &Connection) -> Result<Vec<TableSchema>, String> {
    use std::collections::HashMap;

    let table_names: Vec<String> = {
        let mut stmt = conn
            .prepare(
                "SELECT name FROM sqlite_master \
                 WHERE type='table' AND name NOT LIKE 'sqlite_%' \
                 ORDER BY name",
            )
            .map_err(|e| e.to_string())?;
        let names: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        names
    };

    let mut tables = Vec::new();

    for name in table_names {
        // FK map: local_col → target_table
        let fk_map: HashMap<String, String> = {
            let pragma = format!("PRAGMA foreign_key_list(\"{}\")", name);
            let mut stmt = conn.prepare(&pragma).map_err(|e| e.to_string())?;
            let pairs: Vec<(String, String)> = stmt
                .query_map([], |row| {
                    let target: String = row.get(2)?;
                    let from:   String = row.get(3)?;
                    Ok((from, target))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();
            pairs.into_iter().collect()
        };

        // Columns via PRAGMA table_info
        let columns: Vec<ColumnInfo> = {
            let pragma = format!("PRAGMA table_info(\"{}\")", name);
            let mut stmt = conn.prepare(&pragma).map_err(|e| e.to_string())?;
            let raw: Vec<(String, String, i32, i32)> = stmt
                .query_map([], |row| {
                    Ok((row.get(1)?, row.get(2)?, row.get(3)?, row.get(5)?))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            raw.into_iter()
                .map(|(col_name, col_type, notnull, pk)| {
                    let fk_table = fk_map.get(&col_name).cloned();
                    ColumnInfo {
                        fk: fk_table.is_some(),
                        fk_table,
                        name: col_name,
                        col_type: if col_type.is_empty() {
                            "TEXT".to_string()
                        } else {
                            col_type
                        },
                        nullable: notnull == 0,
                        pk: pk > 0,
                    }
                })
                .collect()
        };

        tables.push(TableSchema { id: name.clone(), name, columns });
    }

    Ok(tables)
}

fn sqlite_run_query(conn: &Connection, sql: &str) -> Result<QueryResult, String> {
    use rusqlite::types::ValueRef;

    let start   = std::time::Instant::now();
    let trimmed = sql.trim().to_uppercase();

    if trimmed.starts_with("INSERT")
        || trimmed.starts_with("UPDATE")
        || trimmed.starts_with("DELETE")
    {
        let affected = conn.execute(sql, []).map_err(|e| e.to_string())?;
        return Ok(QueryResult {
            columns:       vec![],
            rows:          vec![],
            rows_affected: affected,
            exec_ms:       start.elapsed().as_secs_f64() * 1000.0,
        });
    }

    let mut stmt  = conn.prepare(sql).map_err(|e| e.to_string())?;
    let col_count = stmt.column_count();
    let columns: Vec<String> = (0..col_count)
        .map(|i| stmt.column_name(i).unwrap_or("col").to_string())
        .collect();

    let rows: Vec<Vec<serde_json::Value>> = stmt
        .query_map([], |row| {
            let mut values = Vec::new();
            for i in 0..col_count {
                let v = match row.get_ref(i)? {
                    ValueRef::Null       => serde_json::Value::Null,
                    ValueRef::Integer(n) => serde_json::json!(n),
                    ValueRef::Real(f)    => serde_json::Number::from_f64(f)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null),
                    ValueRef::Text(b)    => serde_json::Value::String(
                        String::from_utf8_lossy(b).to_string(),
                    ),
                    ValueRef::Blob(_)    => serde_json::Value::String("[BLOB]".into()),
                };
                values.push(v);
            }
            Ok(values)
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(QueryResult {
        rows_affected: rows.len(),
        exec_ms:       start.elapsed().as_secs_f64() * 1000.0,
        columns,
        rows,
    })
}

// ─── PostgreSQL helpers ────────────────────────────────────────────────────────

async fn pg_get_schema(client: &PgClient) -> Result<Vec<TableSchema>, String> {
    use std::collections::{HashMap, HashSet};

    let table_rows = client
        .query(
            "SELECT table_name \
             FROM information_schema.tables \
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE' \
             ORDER BY table_name",
            &[],
        )
        .await
        .map_err(|e| e.to_string())?;

    let table_names: Vec<String> = table_rows
        .iter()
        .map(|r| r.get::<_, String>(0))
        .collect();

    let mut tables = Vec::new();

    for tname in table_names {
        // Primary keys
        let pk_rows = client
            .query(
                "SELECT kcu.column_name \
                 FROM information_schema.table_constraints tc \
                 JOIN information_schema.key_column_usage kcu \
                   ON tc.constraint_name = kcu.constraint_name \
                   AND tc.table_schema   = kcu.table_schema \
                   AND tc.table_name     = kcu.table_name \
                 WHERE tc.constraint_type = 'PRIMARY KEY' \
                   AND tc.table_schema    = 'public' \
                   AND tc.table_name      = $1",
                &[&tname],
            )
            .await
            .map_err(|e| e.to_string())?;

        let pk_set: HashSet<String> =
            pk_rows.iter().map(|r| r.get::<_, String>(0)).collect();

        // Foreign keys
        let fk_rows = client
            .query(
                "SELECT kcu.column_name, ccu.table_name \
                 FROM information_schema.table_constraints tc \
                 JOIN information_schema.key_column_usage kcu \
                   ON tc.constraint_name = kcu.constraint_name \
                   AND tc.table_schema   = kcu.table_schema \
                   AND tc.table_name     = kcu.table_name \
                 JOIN information_schema.constraint_column_usage ccu \
                   ON ccu.constraint_name = tc.constraint_name \
                   AND ccu.table_schema   = tc.table_schema \
                 WHERE tc.constraint_type = 'FOREIGN KEY' \
                   AND tc.table_schema    = 'public' \
                   AND tc.table_name      = $1",
                &[&tname],
            )
            .await
            .map_err(|e| e.to_string())?;

        let fk_map: HashMap<String, String> = fk_rows
            .iter()
            .map(|r| (r.get::<_, String>(0), r.get::<_, String>(1)))
            .collect();

        // Columns
        let col_rows = client
            .query(
                "SELECT column_name, data_type, is_nullable \
                 FROM information_schema.columns \
                 WHERE table_schema = 'public' AND table_name = $1 \
                 ORDER BY ordinal_position",
                &[&tname],
            )
            .await
            .map_err(|e| e.to_string())?;

        let columns: Vec<ColumnInfo> = col_rows
            .iter()
            .map(|r| {
                let col_name: String = r.get(0);
                let col_type: String = r.get(1);
                let nullable: String = r.get(2); // "YES" | "NO"
                let fk_table = fk_map.get(&col_name).cloned();
                ColumnInfo {
                    pk:       pk_set.contains(&col_name),
                    fk:       fk_table.is_some(),
                    fk_table,
                    col_type: col_type.to_uppercase(),
                    nullable: nullable == "YES",
                    name:     col_name,
                }
            })
            .collect();

        tables.push(TableSchema { id: tname.clone(), name: tname, columns });
    }

    Ok(tables)
}

/// Run arbitrary SQL against PostgreSQL.
/// Uses the simple-query protocol so every value comes back as text —
/// handles NUMERIC, TIMESTAMP, UUID, arrays, and custom types without
/// needing per-type binary decoding.
async fn pg_run_query(client: &PgClient, sql: &str) -> Result<QueryResult, String> {
    use tokio_postgres::SimpleQueryMessage;

    let start = std::time::Instant::now();

    let msgs = client.simple_query(sql).await.map_err(|e| e.to_string())?;

    let mut columns:       Vec<String>                 = vec![];
    let mut rows:          Vec<Vec<serde_json::Value>> = vec![];
    let mut rows_affected: usize                       = 0;

    for msg in msgs {
        match msg {
            SimpleQueryMessage::Row(row) => {
                // Populate column names on the first row
                if columns.is_empty() {
                    columns = row
                        .columns()
                        .iter()
                        .map(|c| c.name().to_string())
                        .collect();
                }
                let values: Vec<serde_json::Value> = (0..row.len())
                    .map(|i| match row.get(i) {
                        Some(s) => serde_json::json!(s),
                        None    => serde_json::Value::Null,
                    })
                    .collect();
                rows.push(values);
            }
            // DML returns CommandComplete with the affected-row count
            SimpleQueryMessage::CommandComplete(n) if rows.is_empty() => {
                rows_affected = n as usize;
            }
            _ => {}
        }
    }

    // For SELECT, override with the actual row count
    if !rows.is_empty() {
        rows_affected = rows.len();
    }

    Ok(QueryResult {
        columns,
        rows,
        rows_affected,
        exec_ms: start.elapsed().as_secs_f64() * 1000.0,
    })
}

// ─── Commands ─────────────────────────────────────────────────────────────────

mod commands {
    use tauri::State;
    use super::{DbState, ActiveDb, TableSchema, QueryResult};

    /// Open a SQLite file and keep the connection alive.
    #[tauri::command]
    pub async fn open_db(path: String, state: State<'_, DbState>) -> Result<(), String> {
        let conn = rusqlite::Connection::open(&path).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=NORMAL;",
        )
        .map_err(|e| e.to_string())?;
        *state.0.lock().await = Some(ActiveDb::Sqlite(conn));
        Ok(())
    }

    /// Connect to a PostgreSQL database.
    #[tauri::command]
    pub async fn connect_pg(
        host:     String,
        port:     u16,
        dbname:   String,
        user:     String,
        password: String,
        ssl:      bool,
        state:    State<'_, DbState>,
    ) -> Result<(), String> {
        let conn_str = format!(
            "host={host} port={port} dbname={dbname} user={user} password={password}"
        );

        let client = if ssl {
            use native_tls::TlsConnector;
            use postgres_native_tls::MakeTlsConnector;

            let tls = TlsConnector::new().map_err(|e| e.to_string())?;
            let connector = MakeTlsConnector::new(tls);

            let (client, connection) = tokio_postgres::connect(&conn_str, connector)
                .await
                .map_err(|e| e.to_string())?;

            tauri::async_runtime::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("[postgres] connection error: {e}");
                }
            });
            client
        } else {
            let (client, connection) =
                tokio_postgres::connect(&conn_str, tokio_postgres::NoTls)
                    .await
                    .map_err(|e| e.to_string())?;

            tauri::async_runtime::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("[postgres] connection error: {e}");
                }
            });
            client
        };

        *state.0.lock().await = Some(ActiveDb::Postgres(client));
        Ok(())
    }

    /// Return the full schema of the connected database.
    #[tauri::command]
    pub async fn get_schema(state: State<'_, DbState>) -> Result<Vec<TableSchema>, String> {
        let guard = state.0.lock().await;
        match guard.as_ref().ok_or("Nessun database aperto")? {
            ActiveDb::Sqlite(conn)     => super::sqlite_get_schema(conn),
            ActiveDb::Postgres(client) => super::pg_get_schema(client).await,
        }
    }

    /// Execute arbitrary SQL and return columns + rows as JSON.
    #[tauri::command]
    pub async fn run_query(sql: String, state: State<'_, DbState>) -> Result<QueryResult, String> {
        let guard = state.0.lock().await;
        match guard.as_ref().ok_or("Nessun database aperto")? {
            ActiveDb::Sqlite(conn)     => super::sqlite_run_query(conn, &sql),
            ActiveDb::Postgres(client) => super::pg_run_query(client, &sql).await,
        }
    }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DbState(Mutex::new(None)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::open_db,
            commands::connect_pg,
            commands::get_schema,
            commands::run_query,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
