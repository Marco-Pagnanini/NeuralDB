export type ColumnDef = {
  name: string
  type: string
  nullable: boolean
  pk?: boolean
  fk?: boolean
}

export type TableDef = {
  id: string
  name: string
  color: string
  x: number
  y: number
  columns: ColumnDef[]
}

export type RelationDef = {
  from: string   // tableId
  to: string
  fromCol: string
  toCol: string
}

export const TABLES: TableDef[] = [
  {
    id: "projects",
    name: "projects",
    color: "#f97316",
    x: 40, y: 80,
    columns: [
      { name: "project_id",        type: "int",          pk: true,  nullable: false },
      { name: "project_name",      type: "varchar(255)",            nullable: false },
      { name: "client_id",         type: "int",          fk: true,  nullable: false },
      { name: "service_id",        type: "int",          fk: true,  nullable: false },
      { name: "assigned_designer", type: "int",          fk: true,  nullable: false },
      { name: "status",            type: "enum",                    nullable: false },
      { name: "deadline",          type: "date",                    nullable: true  },
    ],
  },
  {
    id: "users",
    name: "users",
    color: "#3b82f6",
    x: 400, y: 60,
    columns: [
      { name: "user_id",       type: "int",          pk: true, nullable: false },
      { name: "email",         type: "varchar(255)",            nullable: false },
      { name: "password_hash", type: "varchar(255)",            nullable: false },
      { name: "full_name",     type: "varchar(255)",            nullable: false },
      { name: "role",          type: "enum",                    nullable: false },
      { name: "phone_number",  type: "varchar(20)",             nullable: true  },
    ],
  },
  {
    id: "services",
    name: "services",
    color: "#eab308",
    x: 760, y: 40,
    columns: [
      { name: "service_id",   type: "int",           pk: true, nullable: false },
      { name: "service_name", type: "varchar(100)",            nullable: false },
      { name: "description",  type: "text",                    nullable: true  },
      { name: "base_price",   type: "decimal(10,2)",           nullable: false },
      { name: "duration_days",type: "int",                     nullable: false },
    ],
  },
  {
    id: "clients",
    name: "clients",
    color: "#22c55e",
    x: 760, y: 340,
    columns: [
      { name: "client_id",   type: "int",          pk: true, nullable: false },
      { name: "email",       type: "varchar(255)",            nullable: false },
      { name: "full_name",   type: "varchar(255)",            nullable: false },
      { name: "company",     type: "varchar(255)",            nullable: true  },
      { name: "phone",       type: "varchar(20)",             nullable: true  },
    ],
  },
  {
    id: "invoices",
    name: "invoices",
    color: "#a855f7",
    x: 400, y: 380,
    columns: [
      { name: "invoice_id", type: "int",           pk: true, nullable: false },
      { name: "project_id", type: "int",           fk: true, nullable: false },
      { name: "amount",     type: "decimal(10,2)",           nullable: false },
      { name: "issued_at",  type: "timestamp",               nullable: false },
      { name: "paid",       type: "boolean",                 nullable: false },
    ],
  },
]

export const RELATIONS: RelationDef[] = [
  { from: "projects", to: "users",    fromCol: "assigned_designer", toCol: "user_id"   },
  { from: "projects", to: "services", fromCol: "service_id",        toCol: "service_id" },
  { from: "projects", to: "clients",  fromCol: "client_id",         toCol: "client_id"  },
  { from: "invoices", to: "projects", fromCol: "project_id",        toCol: "project_id" },
]

export const MOCK_QUERY_RESULTS = {
  columns: ["id", "username", "role"],
  rows: [
    [1, "Rayhan",   "Designer"],
    [2, "Rama",     "Designer"],
    [3, "Wolfgang", "Designer"],
    [4, "Mamad",    "Designer"],
    [5, "Sara",     "Creative Director"],
    [6, "Luca",     "Developer"],
  ],
}
