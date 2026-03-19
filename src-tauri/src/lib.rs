use std::sync::Mutex;
use rusqlite::Connection;

// ─── Shared state ─────────────────────────────────────────────────────────────

pub struct DbState(pub Mutex<Option<Connection>>);

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

// ─── Commands (in their own module to avoid macro-name conflicts) ──────────────

mod commands {
    use rusqlite::types::ValueRef;
    use std::collections::HashMap;
    use tauri::State;
    use super::{DbState, ColumnInfo, TableSchema, QueryResult};

    /// Open a SQLite file and keep the connection alive.
    /**
    * Result (), String -> String for Error, () for success
    * We use a Mutex<Option<Connection>> to allow interior mutability and the possibility of "no connection" state.
    * state.0.lock().unwrap() to access the Mutex, then .as_ref() to get Option<&Connection>, and .ok_or(...) to convert None to an error.
    */
    #[tauri::command]
    pub fn open_db(path: String, state: State<DbState>) -> Result<(), String> {
        let conn = rusqlite::Connection::open(&path).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=NORMAL;",
        )
        .map_err(|e| e.to_string())?;
        *state.0.lock().unwrap() = Some(conn);
        Ok(())
    }

    /// Read full schema: all user tables with columns + FK info.
    #[tauri::command]
    pub fn get_schema(state: State<DbState>) -> Result<Vec<TableSchema>, String> {
        let guard = state.0.lock().unwrap();
        let conn = guard.as_ref().ok_or("Nessun database aperto")?;

        // collect table names
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
                        let target_table: String = row.get(2)?;
                        let from_col: String     = row.get(3)?;
                        Ok((from_col, target_table))
                    })
                    .map_err(|e| e.to_string())?
                    .filter_map(|r| r.ok())
                    .collect();
                pairs.into_iter().collect()
            };

            // columns via PRAGMA table_info
            let columns: Vec<ColumnInfo> = {
                let pragma = format!("PRAGMA table_info(\"{}\")", name);
                let mut stmt = conn.prepare(&pragma).map_err(|e| e.to_string())?;
                let raw: Vec<(String, String, i32, i32)> = stmt
                    .query_map([], |row| {
                        let col_name: String = row.get(1)?;
                        let col_type: String = row.get(2)?;
                        let notnull:  i32    = row.get(3)?;
                        let pk:       i32    = row.get(5)?;
                        Ok((col_name, col_type, notnull, pk))
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

            tables.push(TableSchema {
                id: name.clone(),
                name,
                columns,
            });
        }

        Ok(tables)
    }

    /// Execute any SQL and return columns + rows as JSON.
    #[tauri::command]
    pub fn run_query(sql: String, state: State<DbState>) -> Result<QueryResult, String> {
        let guard = state.0.lock().unwrap();
        let conn = guard.as_ref().ok_or("Nessun database aperto")?;

        let start   = std::time::Instant::now();
        let trimmed = sql.trim().to_uppercase();

        // DML → execute()
        if trimmed.starts_with("INSERT")
            || trimmed.starts_with("UPDATE")
            || trimmed.starts_with("DELETE")
        {
            let affected = conn.execute(&sql, []).map_err(|e| e.to_string())?;
            return Ok(QueryResult {
                columns:       vec![],
                rows:          vec![],
                rows_affected: affected,
                exec_ms:       start.elapsed().as_secs_f64() * 1000.0,
            });
        }

        // SELECT / PRAGMA / anything else → query_map()
        let mut stmt  = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let col_count = stmt.column_count();
        let columns: Vec<String> = (0..col_count)
            .map(|i| stmt.column_name(i).unwrap_or("col").to_string())
            .collect();

        let rows: Vec<Vec<serde_json::Value>> = {
            let mapped = stmt
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
                .map_err(|e| e.to_string())?;
            mapped.filter_map(|r| r.ok()).collect()
        };

        Ok(QueryResult {
            rows_affected: rows.len(),
            exec_ms:       start.elapsed().as_secs_f64() * 1000.0,
            columns,
            rows,
        })
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
            commands::get_schema,
            commands::run_query,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
