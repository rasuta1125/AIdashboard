import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Circle,
  User,
  Phone,
  Mail as MailIcon,
  FileText,
  Download,
  Plus,
  Upload,
  Loader2,
  Sparkles,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  mockProjects,
  mockTasks,
  mockContacts,
  mockDocuments,
  TASK_PRIORITIES,
} from "../utils/mockData";
import { uploadContractPDF, generateTaskCompletionEmail, generateEmail } from "../utils/api";
import EmailModal from "../components/EmailModal";
import "../styles/ProjectDetail.css";

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);
  
  // メールモーダル関連
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  useEffect(() => {
    // プロジェクトデータを取得（実際はAPIから取得）
    const projectData = mockProjects.find(
      (p) => p.project_id === parseInt(projectId)
    );
    setProject(projectData);

    // タスクデータを取得
    setTasks(mockTasks[projectId] || []);

    // 関係者データを取得
    setContacts(mockContacts[projectId] || []);

    // 書類データを取得
    setDocuments(mockDocuments[projectId] || []);
  }, [projectId]);

  if (!project) {
    return (
      <div className="project-detail">
        <div className="error-message">案件が見つかりませんでした</div>
      </div>
    );
  }

  // 金額をフォーマット
  const formatPrice = (price) => {
    return new Intl.NumberFormat("ja-JP").format(price);
  };

  // 日付をフォーマット
  const formatDate = (dateString) => {
    if (!dateString) return "未定";
    return format(new Date(dateString), "yyyy年MM月dd日 (E)", { locale: ja });
  };

  // タスクの完了状態を切り替え
  const toggleTaskCompletion = (taskId) => {
    setTasks(
      tasks.map((task) =>
        task.task_id === taskId
          ? { ...task, is_completed: !task.is_completed }
          : task
      )
    );
    // 実際のアプリケーションでは、ここでAPIを呼び出してDBを更新
    console.log(`タスク ${taskId} の完了状態を切り替えました`);
  };

  // タスクの進捗率を計算
  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter((task) => task.is_completed).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  // 緊急のタスク数をカウント
  const countUrgentTasks = () => {
    const today = new Date();
    return tasks.filter((task) => {
      if (task.is_completed || !task.due_date) return false;
      const dueDate = new Date(task.due_date);
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    }).length;
  };

  // ファイルアップロードボタンのクリック処理
  const handleUploadClick = () => {
    setUploadError(null);
    setUploadSuccess(false);
    fileInputRef.current?.click();
  };

  // ファイル選択時の処理
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルタイプチェック
    if (file.type !== "application/pdf") {
      setUploadError("PDFファイルのみアップロード可能です");
      return;
    }

    // ファイルサイズチェック（10MB）
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("ファイルサイズは10MB以下にしてください");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      console.log("契約書PDFをアップロード中...", file.name);
      
      // APIにファイルをアップロード
      const response = await uploadContractPDF(file);
      
      console.log("OCR結果:", response.data);

      // 抽出されたデータで案件情報を自動入力
      if (response.data) {
        setProject((prev) => ({
          ...prev,
          contract_date: response.data.contract_date || prev.contract_date,
          settlement_date: response.data.settlement_date || prev.settlement_date,
          property_price: response.data.property_price || prev.property_price,
          deposit_amount: response.data.deposit_amount || prev.deposit_amount,
          loan_special_clause_deadline:
            response.data.loan_special_clause_deadline ||
            prev.loan_special_clause_deadline,
        }));

        setUploadSuccess(true);
        
        // 成功メッセージを3秒後に非表示
        setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error("アップロードエラー:", error);
      setUploadError(error.message || "契約書の処理中にエラーが発生しました");
    } finally {
      setIsUploading(false);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // メール作成ボタンのクリック処理
  const handleEmailCreate = async () => {
    setIsEmailModalOpen(true);
    setIsGeneratingEmail(true);
    setGeneratedEmail(null);

    try {
      // 買主を取得
      const buyer = contacts.find((c) => c.role === "買主");
      const seller = contacts.find((c) => c.role === "売主");

      // コンテキストを準備
      const context = {
        projectName: project.project_name,
        buyerName: buyer?.name || "お客様",
        sellerName: seller?.name,
        settlementDate: project.settlement_date,
        propertyPrice: project.property_price,
        situation: "案件の進捗についてご連絡いたします",
        nextAction: "引き続き、円滑なお取引のためにサポートさせていただきます",
        recipientRole: "関係者",
      };

      console.log("メール生成リクエスト:", context);

      // メール生成API呼び出し
      const response = await generateEmail(context);
      
      console.log("生成されたメール:", response.email);
      
      setGeneratedEmail(response.email);
    } catch (error) {
      console.error("メール生成エラー:", error);
      alert(`メール生成に失敗しました: ${error.message}`);
      setIsEmailModalOpen(false);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  // タスク完了時のメール生成
  const handleTaskComplete = async (task) => {
    // タスクの完了状態を切り替え
    toggleTaskCompletion(task.task_id);

    // 重要タスクの場合はメール生成を提案
    if (task.priority === "high" && !task.is_completed) {
      const shouldGenerateEmail = window.confirm(
        `「${task.task_name}」が完了しました。\n関係者へのメール文面を生成しますか？`
      );

      if (shouldGenerateEmail) {
        setIsEmailModalOpen(true);
        setIsGeneratingEmail(true);
        setGeneratedEmail(null);

        try {
          // 買主を取得
          const buyer = contacts.find((c) => c.role === "買主");
          const seller = contacts.find((c) => c.role === "売主");

          // タスク完了メールのコンテキスト
          const taskContext = {
            projectName: project.project_name,
            taskName: task.task_name,
            buyerName: buyer?.name || "お客様",
            sellerName: seller?.name,
            settlementDate: project.settlement_date,
            recipientRole: buyer?.name || "お客様",
          };

          console.log("タスク完了メール生成リクエスト:", taskContext);

          // タスク完了メール生成API呼び出し
          const response = await generateTaskCompletionEmail(taskContext);
          
          console.log("生成されたメール:", response.email);
          
          setGeneratedEmail(response.email);
        } catch (error) {
          console.error("タスク完了メール生成エラー:", error);
          alert(`メール生成に失敗しました: ${error.message}`);
          setIsEmailModalOpen(false);
        } finally {
          setIsGeneratingEmail(false);
        }
      }
    }
  };

  return (
    <div className="project-detail">
      {/* ヘッダー */}
      <header className="detail-header">
        <button className="back-button" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
          ダッシュボードに戻る
        </button>
        <h1>{project.project_name}</h1>
        <div className="status-badge">{project.status}</div>
      </header>

      {/* 進捗サマリー */}
      <div className="progress-summary">
        <div className="progress-card">
          <span className="progress-label">タスク進捗</span>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
          <span className="progress-text">
            {tasks.filter((t) => t.is_completed).length} / {tasks.length} 完了 (
            {calculateProgress()}%)
          </span>
        </div>
        {countUrgentTasks() > 0 && (
          <div className="urgent-alert">
            <AlertCircle size={20} />
            <span>緊急タスク: {countUrgentTasks()}件</span>
          </div>
        )}
      </div>

      <div className="detail-content">
        {/* セクション1: 案件基本情報 */}
        <section className="detail-section basic-info">
          <div className="section-header">
            <h2>📋 案件基本情報</h2>
            <div className="header-buttons">
              <button
                className="upload-button"
                onClick={handleUploadClick}
                disabled={isUploading}
                title="契約書PDFをアップロードして情報を自動入力"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="spinning" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    AI-OCR
                  </>
                )}
              </button>
              <button
                className="edit-button"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "保存" : "編集"}
              </button>
            </div>
          </div>

          {/* 隠しファイル入力 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {/* アップロード結果メッセージ */}
          {uploadSuccess && (
            <div className="upload-success-message">
              <CheckCircle2 size={20} />
              契約書情報を自動入力しました！
            </div>
          )}

          {uploadError && (
            <div className="upload-error-message">
              <AlertCircle size={20} />
              {uploadError}
            </div>
          )}

          <div className="info-grid">
            <div className="info-item">
              <label>
                <Calendar size={18} />
                契約日
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={project.contract_date}
                  onChange={(e) =>
                    setProject({ ...project, contract_date: e.target.value })
                  }
                />
              ) : (
                <span className="value">{formatDate(project.contract_date)}</span>
              )}
            </div>

            <div className="info-item">
              <label>
                <Calendar size={18} />
                決済予定日
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={project.settlement_date || ""}
                  onChange={(e) =>
                    setProject({ ...project, settlement_date: e.target.value })
                  }
                />
              ) : (
                <span className="value highlight">
                  {formatDate(project.settlement_date)}
                </span>
              )}
            </div>

            <div className="info-item">
              <label>
                <DollarSign size={18} />
                売買代金
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={project.property_price}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      property_price: parseInt(e.target.value),
                    })
                  }
                />
              ) : (
                <span className="value price">
                  ¥{formatPrice(project.property_price)}
                </span>
              )}
            </div>

            <div className="info-item">
              <label>
                <DollarSign size={18} />
                手付金額
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={project.deposit_amount || ""}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      deposit_amount: parseInt(e.target.value),
                    })
                  }
                />
              ) : (
                <span className="value">
                  {project.deposit_amount
                    ? `¥${formatPrice(project.deposit_amount)}`
                    : "未設定"}
                </span>
              )}
            </div>

            <div className="info-item">
              <label>
                <AlertCircle size={18} />
                融資特約期限
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={project.loan_special_clause_deadline || ""}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      loan_special_clause_deadline: e.target.value,
                    })
                  }
                />
              ) : (
                <span className="value">
                  {formatDate(project.loan_special_clause_deadline)}
                </span>
              )}
            </div>

            <div className="info-item">
              <label>
                <User size={18} />
                担当営業マンID
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={project.sales_rep_id}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      sales_rep_id: parseInt(e.target.value),
                    })
                  }
                />
              ) : (
                <span className="value">{project.sales_rep_id}</span>
              )}
            </div>
          </div>
        </section>

        {/* セクション2: タスクリスト */}
        <section className="detail-section tasks">
          <div className="section-header">
            <h2>✓ タスクリスト</h2>
            <button className="add-button">
              <Plus size={18} />
              タスク追加
            </button>
          </div>

          <div className="task-list">
            {tasks.length === 0 ? (
              <div className="empty-state">
                <p>タスクがありません</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.task_id}
                  className={`task-item ${task.is_completed ? "completed" : ""}`}
                >
                  <div className="task-checkbox">
                    <input
                      type="checkbox"
                      checked={task.is_completed}
                      onChange={() => handleTaskComplete(task)}
                      id={`task-${task.task_id}`}
                    />
                    <label htmlFor={`task-${task.task_id}`}>
                      {task.is_completed ? (
                        <CheckCircle2 size={20} className="check-icon" />
                      ) : (
                        <Circle size={20} className="check-icon" />
                      )}
                    </label>
                  </div>

                  <div className="task-content">
                    <span className="task-name">{task.task_name}</span>
                    <div className="task-meta">
                      {task.due_date && (
                        <span className="task-due-date">
                          期限: {format(new Date(task.due_date), "MM/dd")}
                        </span>
                      )}
                      <span
                        className="task-priority"
                        style={{
                          color: TASK_PRIORITIES[task.priority].color,
                        }}
                      >
                        {TASK_PRIORITIES[task.priority].label}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* セクション3: 関係者・書類リスト */}
        <div className="two-column-section">
          {/* 関係者リスト */}
          <section className="detail-section contacts">
            <div className="section-header">
              <h2>👥 関係者</h2>
              <div className="header-buttons">
                <button 
                  className="email-create-button"
                  onClick={handleEmailCreate}
                  title="AIで連絡メールを作成"
                >
                  <Send size={16} />
                  メール作成
                </button>
                <button className="add-button-small">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="contact-list">
              {contacts.length === 0 ? (
                <div className="empty-state">
                  <p>関係者情報がありません</p>
                </div>
              ) : (
                contacts.map((contact) => (
                  <div key={contact.contact_id} className="contact-item">
                    <div className="contact-header">
                      <span className="contact-role">{contact.role}</span>
                      <span className="contact-name">{contact.name}</span>
                    </div>
                    <div className="contact-details">
                      {contact.phone && (
                        <div className="contact-detail">
                          <Phone size={14} />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div className="contact-detail">
                          <MailIcon size={14} />
                          <span>{contact.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 書類リスト */}
          <section className="detail-section documents">
            <div className="section-header">
              <h2>📄 書類</h2>
              <button className="add-button-small">
                <Plus size={16} />
              </button>
            </div>

            <div className="document-list">
              {documents.length === 0 ? (
                <div className="empty-state">
                  <p>書類情報がありません</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.doc_id} className="document-item">
                    <div className="document-icon">
                      <FileText size={20} />
                    </div>
                    <div className="document-content">
                      <span className="document-name">{doc.doc_name}</span>
                      <span
                        className={`document-status ${
                          doc.status === "受領済" ? "received" : "pending"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                    {doc.file_url && (
                      <button className="download-button" title="ダウンロード">
                        <Download size={16} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* メールモーダル */}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        email={generatedEmail}
        isGenerating={isGeneratingEmail}
      />
    </div>
  );
};

export default ProjectDetail;
