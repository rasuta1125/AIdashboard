# 不動産売買決済特化型タスク管理ソフト - フロントエンド

## 📋 概要

React + Viteで構築された、不動産売買の決済（クロージング）プロセスに特化したタスク管理システムのフロントエンドアプリケーションです。

**作成日**: 2025-11-12  
**技術スタック**: React 18, Vite, React Router, @hello-pangea/dnd, Lucide React, date-fns

---

## 🚀 クイックスタート

### 前提条件

- Node.js 18.0 以上
- npm 8.0 以上

### インストール

```bash
# frontendディレクトリに移動
cd frontend

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

開発サーバーが起動したら、ブラウザで http://localhost:5173 にアクセスしてください。

---

## 📁 プロジェクト構造

```
frontend/
├── src/
│   ├── pages/              # ページコンポーネント
│   │   ├── Dashboard.jsx   # ダッシュボード（カンバンボード）
│   │   └── ProjectDetail.jsx # 案件詳細画面
│   ├── components/         # 再利用可能なコンポーネント
│   ├── styles/             # CSSファイル
│   │   ├── Dashboard.css
│   │   └── ProjectDetail.css
│   ├── utils/              # ユーティリティ関数
│   │   └── mockData.js     # モックデータ
│   ├── hooks/              # カスタムフック
│   ├── App.jsx             # メインアプリケーション
│   ├── App.css             # アプリケーション全体のスタイル
│   ├── main.jsx            # エントリーポイント
│   └── index.css           # グローバルスタイル
├── public/                 # 静的ファイル
├── package.json
├── vite.config.js          # Vite設定
└── index.html              # HTMLテンプレート
```

---

## 🎨 主要画面

### 1. ダッシュボード画面（カンバンボード）

**パス**: `/`  
**ファイル**: `src/pages/Dashboard.jsx`

#### 主な機能

- **カンバンボード形式**: 案件をステータス別（契約直後、融資承認待ち、決済準備中、決済完了）に表示
- **ドラッグ&ドロップ**: 案件カードをドラッグして別の列に移動することでステータスを変更
- **案件カードの情報表示**:
  - 案件名
  - 決済予定日
  - 売買代金
  - 決済までの残り日数
- **緊急度表示**: 決済日が近い案件は色分けして表示
- **統計情報**: 総案件数、進行中、完了済みの件数を表示

#### 使用ライブラリ

- `@hello-pangea/dnd`: ドラッグ&ドロップ機能
- `react-router-dom`: ページ遷移
- `lucide-react`: アイコン
- `date-fns`: 日付フォーマット

### 2. 案件詳細画面

**パス**: `/project/:projectId`  
**ファイル**: `src/pages/ProjectDetail.jsx`

#### 3つのメインセクション

##### セクション1: 案件基本情報

案件の基本情報を表示・編集できるフォーム

- 契約日
- 決済予定日
- 売買代金
- 手付金額
- 融資特約期限
- 担当営業マンID

**編集モード**: 「編集」ボタンをクリックすると、各項目が入力フォームに変わります。

##### セクション2: タスクリスト

この案件に紐づくタスクを一覧表示

- タスク名
- 期限日
- 優先度（高・中・低）
- 完了/未完了のチェックボックス
- タスク進捗バー（完了率を視覚的に表示）

**インタラクション**:
- チェックボックスをクリックしてタスクの完了/未完了を切り替え
- 緊急のタスク（期限が3日以内）がある場合、アラート表示

##### セクション3: 関係者・書類リスト

**関係者リスト**:
- 役割（買主、売主、銀行担当、司法書士など）
- 氏名
- 電話番号
- メールアドレス

**書類リスト**:
- 書類名
- ステータス（未受領、受領済）
- ダウンロードボタン（受領済みの場合）

---

## 🗃️ データ管理

現在はモックデータ（`src/utils/mockData.js`）を使用しています。

### モックデータの構造

```javascript
// 案件データ
mockProjects: [
  {
    project_id: 1,
    project_name: "A様邸 戸建売買",
    status: "契約直後",
    contract_date: "2025-11-01",
    settlement_date: "2025-12-15",
    property_price: 45000000,
    deposit_amount: 4500000,
    loan_special_clause_deadline: "2025-11-22",
    sales_rep_id: 1,
  },
  // ...
]

// タスクデータ（project_idでグループ化）
mockTasks: {
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
    // ...
  ]
}

// 関係者データ
mockContacts: { /* ... */ }

// 書類データ
mockDocuments: { /* ... */ }
```

### API統合の準備

実際のバックエンドAPIに接続する際は、以下の箇所を修正してください：

1. **Dashboard.jsx** の `onDragEnd` 関数内
2. **ProjectDetail.jsx** の `toggleTaskCompletion` 関数内
3. 各コンポーネントの `useEffect` フック内（データ取得部分）

---

## 🎨 スタイリング

### デザインシステム

**カラーパレット**:
- プライマリ: `#667eea` - `#764ba2` (グラデーション)
- 成功: `#48bb78` (緑)
- 警告: `#ed8936` (オレンジ)
- エラー: `#f56565` (赤)
- 情報: `#4299e1` (青)

**レスポンシブデザイン**:
- モバイル: < 768px
- タブレット: 768px - 1200px
- デスクトップ: > 1200px

### CSS変数

グローバルスタイル（`index.css`）でCSS変数を定義しています：

```css
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --primary-color: #667eea;
  --gray-800: #1a202c;
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  /* ... */
}
```

---

## 🧩 使用ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| React | 18.x | UIフレームワーク |
| Vite | 6.x | ビルドツール |
| React Router | 6.x | ルーティング |
| @hello-pangea/dnd | 16.x | ドラッグ&ドロップ |
| lucide-react | 最新 | アイコン |
| date-fns | 4.x | 日付操作 |

---

## 🔧 利用可能なスクリプト

```bash
# 開発サーバーを起動
npm run dev

# 本番用ビルド
npm run build

# ビルドしたアプリをプレビュー
npm run preview

# リンター実行
npm run lint
```

---

## 🚀 主要機能の実装詳細

### 1. ドラッグ&ドロップ機能

`@hello-pangea/dnd` ライブラリを使用しています。

```jsx
<DragDropContext onDragEnd={onDragEnd}>
  <Droppable droppableId={status}>
    {(provided) => (
      <div ref={provided.innerRef} {...provided.droppableProps}>
        <Draggable draggableId={String(project.project_id)} index={index}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
            >
              {/* カード内容 */}
            </div>
          )}
        </Draggable>
      </div>
    )}
  </Droppable>
</DragDropContext>
```

### 2. 日付フォーマット

`date-fns` を使用して日本語形式で日付を表示：

```javascript
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const formatDate = (dateString) => {
  return format(new Date(dateString), "yyyy年MM月dd日 (E)", { locale: ja });
};
```

### 3. ルーティング

React Routerを使用：

```jsx
<Router>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/project/:projectId" element={<ProjectDetail />} />
  </Routes>
</Router>
```

---

## 🔄 次のステップ

### バックエンドAPI統合

1. **APIクライアントの作成**: `src/utils/api.js` を作成し、axios等を使用
2. **データ取得の実装**: モックデータをAPI呼び出しに置き換え
3. **エラーハンドリング**: API失敗時の処理を追加
4. **ローディング状態**: データ取得中の表示を追加

### 追加機能の実装

- [ ] 新規案件の作成フォーム
- [ ] タスクの追加・編集・削除
- [ ] 関係者の追加・編集・削除
- [ ] 書類のアップロード機能
- [ ] 検索・フィルター機能
- [ ] ユーザー認証
- [ ] 通知機能

### パフォーマンス最適化

- [ ] React.memoの活用
- [ ] 仮想化リストの実装（大量データ対応）
- [ ] 画像の遅延読み込み
- [ ] コード分割

---

## 🐛 トラブルシューティング

### 開発サーバーが起動しない

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### ビルドエラーが出る

```bash
# キャッシュをクリア
npm run build -- --force
```

### ホットリロードが動作しない

Vite設定（`vite.config.js`）を確認してください。

---

## 📝 コーディング規約

- **コンポーネント名**: PascalCase（例: `Dashboard.jsx`）
- **関数名**: camelCase（例: `formatDate`）
- **定数**: UPPER_SNAKE_CASE（例: `PROJECT_STATUSES`）
- **CSSクラス名**: kebab-case（例: `project-card`）

---

## 🤝 貢献

プロジェクトへの貢献を歓迎します！

1. フォークする
2. フィーチャーブランチを作成する (`git checkout -b feature/amazing-feature`)
3. 変更をコミットする (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュする (`git push origin feature/amazing-feature`)
5. プルリクエストを開く

---

## 📄 ライセンス

このプロジェクトは非公開プロジェクトです。

---

## 📧 サポート

質問や問題がある場合は、プロジェクトのIssueセクションで報告してください。

---

**更新日**: 2025-11-12  
**バージョン**: 1.0.0
