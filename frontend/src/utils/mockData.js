// モックデータ - 実際のAPIに置き換える前のテスト用データ

export const mockProjects = [
  {
    project_id: 1,
    project_name: "A様邸 戸建売買",
    status: "契約済み",
    contract_date: "2025-11-01",
    settlement_date: "2025-12-15",
    property_price: 45000000,
    deposit_amount: 4500000,
    loan_special_clause_deadline: "2025-11-22",
    sales_rep_id: 1,
  },
  {
    project_id: 2,
    project_name: "Bマンション取引",
    status: "融資承認待ち",
    contract_date: "2025-10-15",
    settlement_date: "2025-12-01",
    property_price: 32000000,
    deposit_amount: 3200000,
    loan_special_clause_deadline: "2025-11-15",
    sales_rep_id: 2,
  },
  {
    project_id: 3,
    project_name: "C様 土地売買",
    status: "決済準備中",
    contract_date: "2025-09-20",
    settlement_date: "2025-11-25",
    property_price: 28000000,
    deposit_amount: 2800000,
    loan_special_clause_deadline: null,
    sales_rep_id: 1,
  },
  {
    project_id: 4,
    project_name: "D様 新築マンション",
    status: "決済完了",
    contract_date: "2025-08-10",
    settlement_date: "2025-10-20",
    property_price: 52000000,
    deposit_amount: 5200000,
    loan_special_clause_deadline: "2025-09-01",
    sales_rep_id: 3,
  },
];

export const mockTasks = {
  1: [
    {
      task_id: 1,
      project_id: 1,
      task_name: "融資承認の確認",
      due_date: "2025-11-20",
      is_completed: false,
      assignee_id: 1,
      priority: "high",
    },
    {
      task_id: 2,
      project_id: 1,
      task_name: "司法書士への連絡",
      due_date: "2025-11-18",
      is_completed: false,
      assignee_id: 1,
      priority: "normal",
    },
    {
      task_id: 3,
      project_id: 1,
      task_name: "決済場所の予約",
      due_date: "2025-11-25",
      is_completed: false,
      assignee_id: 2,
      priority: "normal",
    },
  ],
  2: [
    {
      task_id: 4,
      project_id: 2,
      task_name: "融資承認書の受領",
      due_date: "2025-11-14",
      is_completed: true,
      assignee_id: 2,
      priority: "high",
    },
    {
      task_id: 5,
      project_id: 2,
      task_name: "残代金の確認",
      due_date: "2025-11-28",
      is_completed: false,
      assignee_id: 2,
      priority: "high",
    },
  ],
  3: [
    {
      task_id: 6,
      project_id: 3,
      task_name: "登記書類の準備",
      due_date: "2025-11-23",
      is_completed: false,
      assignee_id: 1,
      priority: "high",
    },
  ],
};

export const mockContacts = {
  1: [
    {
      contact_id: 1,
      project_id: 1,
      role: "買主",
      name: "山田太郎様",
      phone: "03-1234-5678",
      email: "yamada@example.com",
      organization: null,
    },
    {
      contact_id: 2,
      project_id: 1,
      role: "銀行担当",
      name: "C銀行 D支店 E様",
      phone: "03-9876-5432",
      email: "e.tanaka@cbank.co.jp",
      organization: "C銀行 D支店",
    },
    {
      contact_id: 3,
      project_id: 1,
      role: "司法書士",
      name: "佐藤法務事務所 佐藤先生",
      phone: "03-5555-6666",
      email: "sato@legal.co.jp",
      organization: "佐藤法務事務所",
    },
  ],
  2: [
    {
      contact_id: 4,
      project_id: 2,
      role: "買主",
      name: "鈴木花子様",
      phone: "090-1111-2222",
      email: "suzuki@example.com",
      organization: null,
    },
    {
      contact_id: 5,
      project_id: 2,
      role: "売主",
      name: "田中一郎様",
      phone: "090-3333-4444",
      email: "tanaka@example.com",
      organization: null,
    },
  ],
};

export const mockDocuments = {
  1: [
    {
      doc_id: 1,
      project_id: 1,
      doc_name: "売買契約書コピー",
      status: "受領済",
      file_url: "/uploads/project1/contract.pdf",
    },
    {
      doc_id: 2,
      project_id: 1,
      doc_name: "重要事項説明書",
      status: "受領済",
      file_url: "/uploads/project1/disclosure.pdf",
    },
    {
      doc_id: 3,
      project_id: 1,
      doc_name: "融資承認書",
      status: "未受領",
      file_url: null,
    },
  ],
  2: [
    {
      doc_id: 4,
      project_id: 2,
      doc_name: "売買契約書コピー",
      status: "受領済",
      file_url: "/uploads/project2/contract.pdf",
    },
    {
      doc_id: 5,
      project_id: 2,
      doc_name: "融資承認書",
      status: "受領済",
      file_url: "/uploads/project2/loan_approval.pdf",
    },
  ],
};

// ステータスの定義
export const PROJECT_STATUSES = [
  "契約前",
  "契約済み",
  "融資承認待ち",
  "決済準備中",
  "決済完了",
];

// 優先度の定義
export const TASK_PRIORITIES = {
  high: { label: "高", color: "#ef4444" },
  normal: { label: "中", color: "#3b82f6" },
  low: { label: "低", color: "#6b7280" },
};

// 書類ステータスの定義
export const DOCUMENT_STATUSES = ["未受領", "受領済", "確認中", "承認済"];

// 関係者の役割定義
export const CONTACT_ROLES = [
  "買主",
  "売主",
  "銀行担当",
  "司法書士",
  "不動産仲介",
  "土地家屋調査士",
];
