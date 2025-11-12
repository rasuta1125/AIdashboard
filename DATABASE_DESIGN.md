# 不動産売買決済特化型タスク管理ソフト - データベース設計書

## 📋 概要

不動産売買の決済（クロージング）プロセスに特化したタスク管理システムのデータベース設計です。

**作成日**: 2025-11-12  
**データベース**: PostgreSQL（MySQL/MariaDBにも対応可能）

---

## 🗂️ テーブル構成

### 1. Projects（案件テーブル）

**目的**: 契約ごとの基本情報を管理する

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| project_id | SERIAL | PRIMARY KEY | 案件ID（自動採番） |
| project_name | VARCHAR(255) | NOT NULL | 案件名（例: A様邸 戸建売買） |
| status | VARCHAR(50) | NOT NULL, DEFAULT '契約直後' | ステータス |
| contract_date | DATE | NOT NULL | 契約日 |
| settlement_date | DATE | - | 決済予定日 |
| property_price | DECIMAL(15,2) | NOT NULL, CHECK >= 0 | 売買代金 |
| deposit_amount | DECIMAL(15,2) | CHECK >= 0 | 手付金額 |
| loan_special_clause_deadline | DATE | - | 融資特約の期限 |
| sales_rep_id | INTEGER | NOT NULL | 担当営業マンID |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新日時 |

**ステータス例**:
- `契約直後`
- `融資承認待ち`
- `決済準備中`
- `決済完了`

**インデックス**:
- `idx_projects_status` - ステータスでの検索用
- `idx_projects_settlement_date` - 決済日での検索用
- `idx_projects_sales_rep_id` - 担当者での検索用

**制約**:
- 売買代金と手付金額は0以上
- 決済予定日は契約日以降

---

### 2. Tasks（タスクテーブル）

**目的**: 案件ごとに発生する「やることリスト」を管理する

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| task_id | SERIAL | PRIMARY KEY | タスクID（自動採番） |
| project_id | INTEGER | NOT NULL, FOREIGN KEY | 案件ID |
| task_name | VARCHAR(255) | NOT NULL | タスク名（例: 融資承認の確認） |
| due_date | DATE | - | タスク期限日 |
| is_completed | BOOLEAN | DEFAULT FALSE | 完了/未完了フラグ |
| assignee_id | INTEGER | - | タスク担当者ID |
| priority | VARCHAR(20) | DEFAULT 'normal' | 優先度 |
| notes | TEXT | - | タスクメモ |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新日時 |
| completed_at | TIMESTAMP | - | タスク完了日時 |

**優先度**:
- `high` - 高
- `normal` - 通常
- `low` - 低

**外部キー**:
- `project_id` → `Projects(project_id)` - CASCADE設定

**インデックス**:
- `idx_tasks_project_id` - 案件IDでの検索用
- `idx_tasks_due_date` - 期限日での検索用
- `idx_tasks_is_completed` - 完了状態での検索用
- `idx_tasks_assignee_id` - 担当者での検索用

---

### 3. Contacts（関係者テーブル）

**目的**: 案件に関わる関係者（銀行、司法書士など）の連絡先を管理する

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| contact_id | SERIAL | PRIMARY KEY | 関係者ID（自動採番） |
| project_id | INTEGER | NOT NULL, FOREIGN KEY | 案件ID |
| role | VARCHAR(50) | NOT NULL | 役割 |
| name | VARCHAR(255) | NOT NULL | 氏名/組織名 |
| phone | VARCHAR(20) | - | 電話番号 |
| email | VARCHAR(255) | CHECK (email format) | メールアドレス |
| organization | VARCHAR(255) | - | 所属組織 |
| address | TEXT | - | 住所 |
| notes | TEXT | - | メモ |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新日時 |

**役割（role）の例**:
- `買主`
- `売主`
- `銀行担当`
- `司法書士`
- `不動産仲介`
- `土地家屋調査士`

**外部キー**:
- `project_id` → `Projects(project_id)` - CASCADE設定

**インデックス**:
- `idx_contacts_project_id` - 案件IDでの検索用
- `idx_contacts_role` - 役割での検索用

**制約**:
- メールアドレスは簡易的なフォーマット検証

---

### 4. Documents（書類テーブル）

**目的**: 案件ごとに必要な書類（契約書コピーなど）の管理とアップロード

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| doc_id | SERIAL | PRIMARY KEY | 書類ID（自動採番） |
| project_id | INTEGER | NOT NULL, FOREIGN KEY | 案件ID |
| doc_name | VARCHAR(255) | NOT NULL | 書類名 |
| status | VARCHAR(50) | NOT NULL, DEFAULT '未受領' | ステータス |
| file_url | TEXT | - | アップロード先のURL |
| file_size | BIGINT | CHECK <= 100MB | ファイルサイズ（バイト） |
| mime_type | VARCHAR(100) | - | MIMEタイプ |
| description | TEXT | - | 説明 |
| uploaded_at | TIMESTAMP | - | アップロード日時 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新日時 |

**ステータス例**:
- `未受領`
- `受領済`
- `確認中`
- `承認済`

**書類名の例**:
- 売買契約書コピー
- 重要事項説明書
- 融資承認書
- 印鑑証明書
- 住民票
- 登記済証（権利証）

**外部キー**:
- `project_id` → `Projects(project_id)` - CASCADE設定

**インデックス**:
- `idx_documents_project_id` - 案件IDでの検索用
- `idx_documents_status` - ステータスでの検索用

**制約**:
- ファイルサイズは100MBまで

---

## 📊 便利なビュー

### 1. project_task_summary（案件タスクサマリー）

案件ごとのタスク進捗状況を表示

**カラム**:
- `project_id` - 案件ID
- `project_name` - 案件名
- `project_status` - 案件ステータス
- `settlement_date` - 決済予定日
- `total_tasks` - 総タスク数
- `completed_tasks` - 完了タスク数
- `completion_rate` - 完了率（%）

### 2. upcoming_tasks（期限が近いタスク）

今後7日以内に期限が来る未完了タスクを表示

**カラム**:
- `task_id` - タスクID
- `task_name` - タスク名
- `due_date` - 期限日
- `priority` - 優先度
- `project_name` - 案件名
- `project_status` - 案件ステータス
- `urgency` - 緊急度（期限超過/本日期限/緊急/通常）

### 3. project_details（案件詳細）

案件の詳細情報と関連情報の件数を表示

**カラム**:
- `project_id` - 案件ID
- `project_name` - 案件名
- `status` - ステータス
- `contract_date` - 契約日
- `settlement_date` - 決済予定日
- `property_price` - 売買代金
- `deposit_amount` - 手付金額
- `contact_count` - 関係者数
- `document_count` - 書類総数
- `received_documents` - 受領済書類数

---

## 🔗 リレーション図

```
Projects (案件)
    ↓ 1:N
    ├─→ Tasks (タスク)
    ├─→ Contacts (関係者)
    └─→ Documents (書類)
```

**リレーションの特徴**:
- すべて `ON DELETE CASCADE` 設定
- 案件を削除すると、関連するタスク、関係者、書類も削除される
- `ON UPDATE CASCADE` でIDの更新も自動反映

---

## 🚀 データベースのセットアップ

### PostgreSQLの場合

```bash
# データベース作成
createdb real_estate_settlement

# スキーマ適用
psql real_estate_settlement < database_schema.sql
```

### MySQLの場合

一部の構文を調整する必要があります：
- `SERIAL` → `INT AUTO_INCREMENT`
- `BOOLEAN` → `TINYINT(1)`
- `INTERVAL '7 days'` → `DATE_ADD(CURDATE(), INTERVAL 7 DAY)`

---

## 📝 サンプルデータ

スキーマファイルには以下のサンプルデータが含まれています：

- **案件**: 3件（戸建売買、マンション取引、土地売買）
- **タスク**: 5件（融資確認、司法書士連絡など）
- **関係者**: 5件（買主、銀行担当、司法書士など）
- **書類**: 5件（契約書、重要事項説明書、融資承認書など）

---

## 🔍 よく使うクエリ例

### 1. 案件の進捗状況を確認

```sql
SELECT * FROM project_task_summary
ORDER BY settlement_date ASC;
```

### 2. 期限が近いタスクを確認

```sql
SELECT * FROM upcoming_tasks;
```

### 3. 特定案件の関係者一覧

```sql
SELECT role, name, phone, email 
FROM Contacts 
WHERE project_id = 1;
```

### 4. 未受領の書類を確認

```sql
SELECT p.project_name, d.doc_name
FROM Documents d
JOIN Projects p ON d.project_id = p.project_id
WHERE d.status = '未受領'
ORDER BY p.settlement_date ASC;
```

### 5. 決済準備が必要な案件

```sql
SELECT project_name, settlement_date, 
       settlement_date - CURRENT_DATE AS days_until_settlement
FROM Projects
WHERE status IN ('融資承認待ち', '決済準備中')
  AND settlement_date >= CURRENT_DATE
ORDER BY settlement_date ASC;
```

---

## 🛠️ 今後の拡張案

1. **ユーザー管理テーブル**: 営業担当者の情報を管理
2. **通知テーブル**: タスク期限のリマインダー記録
3. **履歴テーブル**: 案件の変更履歴を追跡
4. **テンプレートテーブル**: タスクや書類のテンプレート管理
5. **支払いテーブル**: 手付金、中間金、残代金の支払い履歴

---

## 📚 参考情報

- **PostgreSQL公式ドキュメント**: https://www.postgresql.org/docs/
- **SQLベストプラクティス**: インデックス、正規化、パフォーマンスチューニング
- **データバックアップ**: 定期的なバックアップ設定を推奨

---

## ✅ チェックリスト

- [x] 4つの主要テーブル設計完了
- [x] 外部キー制約の設定
- [x] インデックスの作成
- [x] データ検証制約の追加
- [x] 便利なビューの作成
- [x] サンプルデータの投入
- [x] ドキュメント作成

---

**更新日**: 2025-11-12  
**バージョン**: 1.0.0
