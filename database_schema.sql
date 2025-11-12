-- ============================================================
-- 不動産売買の決済（クロージング）特化型タスク管理ソフト
-- データベーススキーマ定義
-- 作成日: 2025-11-12
-- ============================================================

-- ============================================================
-- 1. 案件テーブル (Projects)
-- 目的: 契約ごとの基本情報を管理する
-- ============================================================
CREATE TABLE Projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT '契約直後',
    contract_date DATE NOT NULL,
    settlement_date DATE,
    property_price DECIMAL(15, 2) NOT NULL,
    deposit_amount DECIMAL(15, 2),
    loan_special_clause_deadline DATE,
    sales_rep_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT chk_property_price CHECK (property_price >= 0),
    CONSTRAINT chk_deposit_amount CHECK (deposit_amount >= 0),
    CONSTRAINT chk_settlement_after_contract CHECK (settlement_date >= contract_date OR settlement_date IS NULL)
);

-- インデックス作成（検索パフォーマンス向上）
CREATE INDEX idx_projects_status ON Projects(status);
CREATE INDEX idx_projects_settlement_date ON Projects(settlement_date);
CREATE INDEX idx_projects_sales_rep_id ON Projects(sales_rep_id);

-- コメント追加
COMMENT ON TABLE Projects IS '不動産売買案件の基本情報を管理するテーブル';
COMMENT ON COLUMN Projects.project_id IS '案件ID（主キー、自動採番）';
COMMENT ON COLUMN Projects.project_name IS '案件名（例: A様邸 戸建売買）';
COMMENT ON COLUMN Projects.status IS 'ステータス（例: 契約直後、融資承認待ち、決済準備中、決済完了）';
COMMENT ON COLUMN Projects.contract_date IS '契約日';
COMMENT ON COLUMN Projects.settlement_date IS '決済予定日';
COMMENT ON COLUMN Projects.property_price IS '売買代金';
COMMENT ON COLUMN Projects.deposit_amount IS '手付金額';
COMMENT ON COLUMN Projects.loan_special_clause_deadline IS '融資特約の期限';
COMMENT ON COLUMN Projects.sales_rep_id IS '担当営業マンID';

-- ============================================================
-- 2. タスクテーブル (Tasks)
-- 目的: 案件ごとに発生する「やることリスト」を管理する
-- ============================================================
CREATE TABLE Tasks (
    task_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    due_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    assignee_id INTEGER,
    priority VARCHAR(20) DEFAULT 'normal',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) 
        REFERENCES Projects(project_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- インデックス作成
CREATE INDEX idx_tasks_project_id ON Tasks(project_id);
CREATE INDEX idx_tasks_due_date ON Tasks(due_date);
CREATE INDEX idx_tasks_is_completed ON Tasks(is_completed);
CREATE INDEX idx_tasks_assignee_id ON Tasks(assignee_id);

-- コメント追加
COMMENT ON TABLE Tasks IS '案件ごとのタスク（やることリスト）を管理するテーブル';
COMMENT ON COLUMN Tasks.task_id IS 'タスクID（主キー、自動採番）';
COMMENT ON COLUMN Tasks.project_id IS '案件ID（外部キー）';
COMMENT ON COLUMN Tasks.task_name IS 'タスク名（例: 融資承認の確認）';
COMMENT ON COLUMN Tasks.due_date IS 'タスク期限日';
COMMENT ON COLUMN Tasks.is_completed IS '完了/未完了フラグ';
COMMENT ON COLUMN Tasks.assignee_id IS 'タスク担当者ID';
COMMENT ON COLUMN Tasks.priority IS '優先度（high, normal, low）';
COMMENT ON COLUMN Tasks.notes IS 'タスクメモ';
COMMENT ON COLUMN Tasks.completed_at IS 'タスク完了日時';

-- ============================================================
-- 3. 関係者テーブル (Contacts)
-- 目的: 案件に関わる関係者の連絡先を管理する
-- ============================================================
CREATE TABLE Contacts (
    contact_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    organization VARCHAR(255),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_contacts_project FOREIGN KEY (project_id) 
        REFERENCES Projects(project_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- メールフォーマット検証（簡易版）
    CONSTRAINT chk_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- インデックス作成
CREATE INDEX idx_contacts_project_id ON Contacts(project_id);
CREATE INDEX idx_contacts_role ON Contacts(role);

-- コメント追加
COMMENT ON TABLE Contacts IS '案件に関わる関係者の連絡先を管理するテーブル';
COMMENT ON COLUMN Contacts.contact_id IS '関係者ID（主キー、自動採番）';
COMMENT ON COLUMN Contacts.project_id IS '案件ID（外部キー）';
COMMENT ON COLUMN Contacts.role IS '役割（例: 買主、売主、銀行担当、司法書士）';
COMMENT ON COLUMN Contacts.name IS '氏名/組織名（例: C銀行 D支店 E様）';
COMMENT ON COLUMN Contacts.phone IS '電話番号';
COMMENT ON COLUMN Contacts.email IS 'メールアドレス';
COMMENT ON COLUMN Contacts.organization IS '所属組織';
COMMENT ON COLUMN Contacts.address IS '住所';

-- ============================================================
-- 4. 書類テーブル (Documents)
-- 目的: 案件ごとに必要な書類の管理とアップロード
-- ============================================================
CREATE TABLE Documents (
    doc_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    doc_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT '未受領',
    file_url TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_documents_project FOREIGN KEY (project_id) 
        REFERENCES Projects(project_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- ファイルサイズ検証（100MBまで）
    CONSTRAINT chk_file_size CHECK (file_size IS NULL OR file_size <= 104857600)
);

-- インデックス作成
CREATE INDEX idx_documents_project_id ON Documents(project_id);
CREATE INDEX idx_documents_status ON Documents(status);

-- コメント追加
COMMENT ON TABLE Documents IS '案件ごとの必要書類を管理するテーブル';
COMMENT ON COLUMN Documents.doc_id IS '書類ID（主キー、自動採番）';
COMMENT ON COLUMN Documents.project_id IS '案件ID（外部キー）';
COMMENT ON COLUMN Documents.doc_name IS '書類名（例: 売買契約書コピー）';
COMMENT ON COLUMN Documents.status IS 'ステータス（例: 未受領、受領済）';
COMMENT ON COLUMN Documents.file_url IS 'アップロード先のURL';
COMMENT ON COLUMN Documents.file_size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN Documents.mime_type IS 'MIMEタイプ（例: application/pdf）';
COMMENT ON COLUMN Documents.uploaded_at IS 'アップロード日時';

-- ============================================================
-- サンプルデータ挿入（開発・テスト用）
-- ============================================================

-- 案件サンプル
INSERT INTO Projects (
    project_name, 
    status, 
    contract_date, 
    settlement_date, 
    property_price, 
    deposit_amount, 
    loan_special_clause_deadline, 
    sales_rep_id
) VALUES 
    ('A様邸 戸建売買', '契約直後', '2025-11-01', '2025-12-15', 45000000, 4500000, '2025-11-22', 1),
    ('Bマンション取引', '融資承認待ち', '2025-10-15', '2025-12-01', 32000000, 3200000, '2025-11-15', 2),
    ('C様 土地売買', '決済準備中', '2025-09-20', '2025-11-25', 28000000, 2800000, NULL, 1);

-- タスクサンプル
INSERT INTO Tasks (
    project_id, 
    task_name, 
    due_date, 
    is_completed, 
    assignee_id,
    priority
) VALUES 
    (1, '融資承認の確認', '2025-11-20', FALSE, 1, 'high'),
    (1, '司法書士への連絡', '2025-11-18', FALSE, 1, 'normal'),
    (1, '決済場所の予約', '2025-11-25', FALSE, 2, 'normal'),
    (2, '融資承認書の受領', '2025-11-14', TRUE, 2, 'high'),
    (2, '残代金の確認', '2025-11-28', FALSE, 2, 'high');

-- 関係者サンプル
INSERT INTO Contacts (
    project_id, 
    role, 
    name, 
    phone, 
    email,
    organization
) VALUES 
    (1, '買主', '山田太郎様', '03-1234-5678', 'yamada@example.com', NULL),
    (1, '銀行担当', 'C銀行 D支店 E様', '03-9876-5432', 'e.tanaka@cbank.co.jp', 'C銀行 D支店'),
    (1, '司法書士', '佐藤法務事務所 佐藤先生', '03-5555-6666', 'sato@legal.co.jp', '佐藤法務事務所'),
    (2, '買主', '鈴木花子様', '090-1111-2222', 'suzuki@example.com', NULL),
    (2, '売主', '田中一郎様', '090-3333-4444', 'tanaka@example.com', NULL);

-- 書類サンプル
INSERT INTO Documents (
    project_id, 
    doc_name, 
    status, 
    file_url
) VALUES 
    (1, '売買契約書コピー', '受領済', '/uploads/project1/contract.pdf'),
    (1, '重要事項説明書', '受領済', '/uploads/project1/disclosure.pdf'),
    (1, '融資承認書', '未受領', NULL),
    (2, '売買契約書コピー', '受領済', '/uploads/project2/contract.pdf'),
    (2, '融資承認書', '受領済', '/uploads/project2/loan_approval.pdf');

-- ============================================================
-- 便利なビュー作成
-- ============================================================

-- 案件とタスクの進捗状況を一覧表示するビュー
CREATE VIEW project_task_summary AS
SELECT 
    p.project_id,
    p.project_name,
    p.status AS project_status,
    p.settlement_date,
    COUNT(t.task_id) AS total_tasks,
    SUM(CASE WHEN t.is_completed THEN 1 ELSE 0 END) AS completed_tasks,
    ROUND(
        100.0 * SUM(CASE WHEN t.is_completed THEN 1 ELSE 0 END) / NULLIF(COUNT(t.task_id), 0),
        2
    ) AS completion_rate
FROM Projects p
LEFT JOIN Tasks t ON p.project_id = t.project_id
GROUP BY p.project_id, p.project_name, p.status, p.settlement_date;

-- 期限が近いタスク一覧ビュー（今後7日以内）
CREATE VIEW upcoming_tasks AS
SELECT 
    t.task_id,
    t.task_name,
    t.due_date,
    t.priority,
    p.project_name,
    p.status AS project_status,
    CASE 
        WHEN t.due_date < CURRENT_DATE THEN '期限超過'
        WHEN t.due_date = CURRENT_DATE THEN '本日期限'
        WHEN t.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN '緊急'
        ELSE '通常'
    END AS urgency
FROM Tasks t
INNER JOIN Projects p ON t.project_id = p.project_id
WHERE t.is_completed = FALSE
  AND t.due_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY t.due_date ASC;

-- 案件の詳細情報ビュー（関係者と書類の件数を含む）
CREATE VIEW project_details AS
SELECT 
    p.project_id,
    p.project_name,
    p.status,
    p.contract_date,
    p.settlement_date,
    p.property_price,
    p.deposit_amount,
    COUNT(DISTINCT c.contact_id) AS contact_count,
    COUNT(DISTINCT d.doc_id) AS document_count,
    SUM(CASE WHEN d.status = '受領済' THEN 1 ELSE 0 END) AS received_documents
FROM Projects p
LEFT JOIN Contacts c ON p.project_id = c.project_id
LEFT JOIN Documents d ON p.project_id = d.project_id
GROUP BY p.project_id, p.project_name, p.status, p.contract_date, 
         p.settlement_date, p.property_price, p.deposit_amount;

COMMENT ON VIEW project_task_summary IS '案件ごとのタスク進捗状況サマリー';
COMMENT ON VIEW upcoming_tasks IS '今後7日以内に期限が来るタスク一覧';
COMMENT ON VIEW project_details IS '案件の詳細情報（関係者数、書類数を含む）';
