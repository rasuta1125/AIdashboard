# ER図（エンティティ・リレーション図）

## 不動産売買決済特化型タスク管理ソフト

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Projects（案件）                             │
├─────────────────────────────────────────────────────────────────────┤
│ PK  project_id                SERIAL                                 │
│     project_name              VARCHAR(255)                           │
│     status                    VARCHAR(50)                            │
│     contract_date             DATE                                   │
│     settlement_date           DATE                                   │
│     property_price            DECIMAL(15,2)                          │
│     deposit_amount            DECIMAL(15,2)                          │
│     loan_special_clause_deadline  DATE                               │
│     sales_rep_id              INTEGER                                │
│     created_at                TIMESTAMP                              │
│     updated_at                TIMESTAMP                              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            │ N                     │ N                     │ N
            │                       │                       │
┌───────────▼──────────┐  ┌─────────▼────────┐  ┌─────────▼──────────┐
│   Tasks（タスク）     │  │ Contacts（関係者） │  │Documents（書類）    │
├──────────────────────┤  ├──────────────────┤  ├────────────────────┤
│ PK  task_id   SERIAL │  │ PK  contact_id   │  │ PK  doc_id  SERIAL │
│ FK  project_id INT   │  │     SERIAL        │  │ FK  project_id INT │
│     task_name        │  │ FK  project_id   │  │     doc_name       │
│     VARCHAR(255)     │  │     INT           │  │     VARCHAR(255)   │
│     due_date   DATE  │  │     role          │  │     status         │
│     is_completed     │  │     VARCHAR(50)   │  │     VARCHAR(50)    │
│     BOOLEAN          │  │     name          │  │     file_url  TEXT │
│     assignee_id INT  │  │     VARCHAR(255)  │  │     file_size      │
│     priority         │  │     phone         │  │     BIGINT         │
│     VARCHAR(20)      │  │     VARCHAR(20)   │  │     mime_type      │
│     notes      TEXT  │  │     email         │  │     VARCHAR(100)   │
│     created_at       │  │     VARCHAR(255)  │  │     description    │
│     TIMESTAMP        │  │     organization  │  │     TEXT           │
│     updated_at       │  │     VARCHAR(255)  │  │     uploaded_at    │
│     TIMESTAMP        │  │     address  TEXT │  │     TIMESTAMP      │
│     completed_at     │  │     notes    TEXT │  │     created_at     │
│     TIMESTAMP        │  │     created_at    │  │     TIMESTAMP      │
└──────────────────────┘  │     TIMESTAMP     │  │     updated_at     │
                          │     updated_at    │  │     TIMESTAMP      │
                          │     TIMESTAMP     │  └────────────────────┘
                          └──────────────────┘
```

## リレーションの詳細

### 1. Projects → Tasks (1:N)
- 1つの案件に対して、複数のタスクが紐づく
- **外部キー**: `Tasks.project_id` → `Projects.project_id`
- **削除時の動作**: CASCADE（案件を削除するとタスクも削除）

### 2. Projects → Contacts (1:N)
- 1つの案件に対して、複数の関係者が紐づく
- **外部キー**: `Contacts.project_id` → `Projects.project_id`
- **削除時の動作**: CASCADE（案件を削除すると関係者情報も削除）

### 3. Projects → Documents (1:N)
- 1つの案件に対して、複数の書類が紐づく
- **外部キー**: `Documents.project_id` → `Projects.project_id`
- **削除時の動作**: CASCADE（案件を削除すると書類情報も削除）

## 主要なインデックス

### Projects
- `idx_projects_status` - ステータスでの絞り込み
- `idx_projects_settlement_date` - 決済日での並び替え
- `idx_projects_sales_rep_id` - 担当者での絞り込み

### Tasks
- `idx_tasks_project_id` - 案件ごとのタスク取得
- `idx_tasks_due_date` - 期限日での並び替え
- `idx_tasks_is_completed` - 完了/未完了での絞り込み
- `idx_tasks_assignee_id` - 担当者ごとのタスク取得

### Contacts
- `idx_contacts_project_id` - 案件ごとの関係者取得
- `idx_contacts_role` - 役割ごとの絞り込み

### Documents
- `idx_documents_project_id` - 案件ごとの書類取得
- `idx_documents_status` - ステータスごとの絞り込み

## データフロー例

```
新規案件登録
    ↓
Projectsテーブルに挿入
    ↓
┌─────────────┬─────────────┬─────────────┐
│             │             │             │
▼             ▼             ▼             ▼
Tasksに      Contactsに    Documentsに
標準タスク    関係者情報    必要書類
を自動生成    を登録        リストを登録
│             │             │
└─────────────┴─────────────┴─────────────┘
                    ↓
            進捗管理・更新
                    ↓
            決済完了時に
            ステータス更新
```

## ビューの関係

```
┌────────────────────────────────────────────┐
│         便利なビュー（VIEW）                 │
├────────────────────────────────────────────┤
│                                            │
│  1. project_task_summary                  │
│     - Projects + Tasks の集計              │
│     - 完了率の計算                          │
│                                            │
│  2. upcoming_tasks                        │
│     - Tasks + Projects の結合              │
│     - 期限が近いタスクの抽出                │
│                                            │
│  3. project_details                       │
│     - Projects + Contacts + Documents     │
│     - 案件の総合情報                        │
│                                            │
└────────────────────────────────────────────┘
```

## カーディナリティ（多重度）

```
Projects  1 ────── N  Tasks
          1 ────── N  Contacts  
          1 ────── N  Documents

凡例:
1: 1つ
N: 複数（0個以上）
```

## 制約と検証ルール

### Projects
- `property_price >= 0` - 売買代金は0以上
- `deposit_amount >= 0` - 手付金額は0以上
- `settlement_date >= contract_date` - 決済日は契約日以降

### Tasks
- `is_completed` はBoolean型（TRUE/FALSE）

### Contacts
- `email` はメールアドレス形式

### Documents
- `file_size <= 104857600` - ファイルサイズは100MB以下

---

**更新日**: 2025-11-12
