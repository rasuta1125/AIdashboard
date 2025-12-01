import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, TrendingUp, AlertTriangle, ChevronRight, Plus, Upload, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { mockProjects, mockTasks, PROJECT_STATUSES } from "../utils/mockData";
import { checkRisksWithAI, uploadContractPDF } from "../utils/api";
import MobileBottomNav from "../components/MobileBottomNav";
import ProjectModal from "../components/ProjectModal";
import "../styles/MobileDashboard.css";

const MobileDashboard = () => {
  // localStorageから案件データを読み込む（PC版と同期）
  const [projects, setProjects] = useState(() => {
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
      return JSON.parse(savedProjects);
    }
    // 初回のみmockProjectsをlocalStorageに保存
    localStorage.setItem('projects', JSON.stringify(mockProjects));
    return mockProjects;
  });
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);
  const [isCheckingRisks, setIsCheckingRisks] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const pdfInputRef = useRef(null);
  const navigate = useNavigate();

  // projectsが変更されたらlocalStorageに保存（PC版と同期）
  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  // localStorageの変更を監視（他のタブ/画面での変更を反映）
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'projects' && e.newValue) {
        setProjects(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 初回マウント時にリスクチェック
  useEffect(() => {
    handleRiskCheck();
  }, []);

  // リスクチェック処理
  const handleRiskCheck = async () => {
    setIsCheckingRisks(true);
    try {
      const tasksMap = {};
      Object.keys(mockTasks).forEach((projectId) => {
        tasksMap[projectId] = mockTasks[projectId];
      });

      const result = await checkRisksWithAI({
        projects: projects,
        tasksMap: tasksMap,
        contactsMap: {},
      });

      if (result.success && result.alerts) {
        setRiskAlerts(result.alerts);
      }
    } catch (error) {
      console.error("リスクチェックエラー:", error);
    } finally {
      setIsCheckingRisks(false);
    }
  };

  // 案件の手動追加
  const handleAddProject = () => {
    setIsProjectModalOpen(true);
  };

  // 案件の保存
  const handleSaveProject = (projectData) => {
    const newProject = {
      ...projectData,
      project_id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    setIsProjectModalOpen(false);
    alert('✅ 案件を追加しました！');
  };

  // AI-OCR案件作成（PDF アップロード）
  const handlePDFUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // PDFファイルチェック
    if (file.type !== 'application/pdf') {
      alert('PDFファイルを選択してください');
      return;
    }

    // ファイルサイズチェック（10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズは10MB以下にしてください');
      return;
    }

    setIsUploadingPDF(true);

    try {
      console.log('PDF アップロード開始...');
      const response = await uploadContractPDF(file);
      console.log('OCR結果:', response);

      if (response.success && response.data) {
        // OCRデータから新規案件を作成
        const ocrData = response.data;
        const newProject = {
          project_id: `proj_${Date.now()}`,
          project_name: `${ocrData.property_address || '新規案件'} - 売買案件`,
          status: '契約済み',
          contract_date: ocrData.contract_date || '',
          settlement_date: ocrData.settlement_date || '',
          property_price: parseInt(ocrData.property_price) || 0,
          deposit_amount: parseInt(ocrData.deposit_amount) || 0,
          loan_special_clause_deadline: ocrData.loan_special_clause_deadline || '',
          buyer_name: '',
          seller_name: '',
          property_address: ocrData.property_address || '',
        };

        // localStorageに保存（PC版と同期）
        const updatedProjects = [...projects, newProject];
        setProjects(updatedProjects);
        localStorage.setItem('projects', JSON.stringify(updatedProjects));

        alert('AI-OCRで案件を作成しました！');
        
        // 案件詳細画面に移動
        navigate(`/project/${newProject.project_id}`);
      } else {
        alert('契約書の情報抽出に失敗しました');
      }
    } catch (error) {
      console.error('PDF アップロードエラー:', error);
      alert('PDFのアップロードに失敗しました: ' + error.message);
    } finally {
      setIsUploadingPDF(false);
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
    }
  };

  // 金額をフォーマット
  const formatPrice = (price) => {
    return new Intl.NumberFormat("ja-JP").format(price);
  };

  // 日付をフォーマット
  const formatDate = (dateString) => {
    if (!dateString) return "未定";
    return format(new Date(dateString), "M/d (E)", { locale: ja });
  };

  // 決済日までの日数を計算
  const getDaysUntilSettlement = (settlementDate) => {
    if (!settlementDate) return null;
    const today = new Date();
    const settlement = new Date(settlementDate);
    const diffTime = settlement - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // フィルター済みプロジェクト
  const filteredProjects =
    selectedStatus === "all"
      ? projects
      : projects.filter((p) => p.status === selectedStatus);

  // 統計データ
  const stats = {
    total: projects.length,
    inProgress: projects.filter((p) => p.status !== "決済完了").length,
    completed: projects.filter((p) => p.status === "決済完了").length,
    risks: riskAlerts.length,
  };

  return (
    <div className="mobile-dashboard">
      {/* ヘッダー */}
      <header className="mobile-header">
        <div className="header-content">
          <h1>📊 案件管理</h1>
          <button className="calendar-button" onClick={() => navigate("/calendar")}>
            <Calendar size={20} />
          </button>
        </div>

        {/* 統計カード */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">総案件</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">進行中</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">完了</span>
          </div>
          {stats.risks > 0 && (
            <div className="stat-card risk">
              <span className="stat-value">{stats.risks}</span>
              <span className="stat-label">リスク</span>
            </div>
          )}
        </div>

        {/* AIリスクチェックボタン */}
        <button 
          className="risk-check-button"
          onClick={handleRiskCheck}
          disabled={isCheckingRisks}
        >
          {isCheckingRisks ? (
            <><RefreshCw size={16} className="spinning" /> チェック中...</>
          ) : (
            <><AlertTriangle size={16} /> AIリスクチェック</>
          )}
        </button>

        {/* リスクアラート（簡易版） */}
        {riskAlerts.length > 0 && (
          <div className="mobile-risk-banner">
            <AlertTriangle size={18} />
            <span>{riskAlerts.length}件のリスクが検出されました</span>
            <button onClick={() => navigate("/alerts")}>詳細</button>
          </div>
        )}

        {/* ステータスフィルター */}
        <div className="status-filter">
          <button
            className={`filter-chip ${selectedStatus === "all" ? "active" : ""}`}
            onClick={() => setSelectedStatus("all")}
          >
            全て
          </button>
          {PROJECT_STATUSES.map((status) => (
            <button
              key={status}
              className={`filter-chip ${selectedStatus === status ? "active" : ""}`}
              onClick={() => setSelectedStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </header>

      {/* プロジェクトリスト */}
      <div className="mobile-project-list">
        {filteredProjects.map((project) => {
          const daysUntil = getDaysUntilSettlement(project.settlement_date);
          const hasRisk = riskAlerts.some((alert) => alert.projectId === project.project_id);

          return (
            <div
              key={project.project_id}
              className={`mobile-project-card ${hasRisk ? "has-risk" : ""}`}
              onClick={() => navigate(`/project/${project.project_id}`)}
            >
              {/* リスクバッジ */}
              {hasRisk && (
                <div className="risk-indicator">
                  <AlertTriangle size={14} />
                </div>
              )}

              {/* プロジェクト情報 */}
              <div className="project-header">
                <h3 className="project-name">{project.project_name}</h3>
                <ChevronRight size={20} className="chevron" />
              </div>

              <div className="project-details">
                {/* ステータスバッジ */}
                <span className={`status-badge ${project.status}`}>
                  {project.status}
                </span>

                {/* 決済日 */}
                <div className="detail-row">
                  <Calendar size={14} />
                  <span className="detail-label">決済日:</span>
                  <span className="detail-value">{formatDate(project.settlement_date)}</span>
                </div>

                {/* 残り日数 */}
                {daysUntil !== null && (
                  <div
                    className={`days-badge ${
                      daysUntil < 0
                        ? "overdue"
                        : daysUntil <= 3
                        ? "urgent"
                        : daysUntil <= 7
                        ? "warning"
                        : ""
                    }`}
                  >
                    {daysUntil < 0
                      ? `${Math.abs(daysUntil)}日超過`
                      : daysUntil === 0
                      ? "本日決済"
                      : `あと${daysUntil}日`}
                  </div>
                )}

                {/* 売買代金 */}
                <div className="detail-row">
                  <TrendingUp size={14} />
                  <span className="detail-label">売買代金:</span>
                  <span className="detail-value price">
                    ¥{formatPrice(project.property_price)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="empty-state">
            <p>該当する案件がありません</p>
          </div>
        )}
      </div>

      {/* フローティングアクションボタン（メニュー付き） */}
      <input
        type="file"
        ref={pdfInputRef}
        onChange={handlePDFUpload}
        accept=".pdf"
        style={{ display: 'none' }}
      />
      
      {/* FABメニュー */}
      {isFabMenuOpen && (
        <div className="fab-menu">
          <button 
            className="fab-menu-item"
            onClick={() => {
              setIsFabMenuOpen(false);
              handleAddProject();
            }}
          >
            <Plus size={20} />
            <span>手動で追加</span>
          </button>
          <button 
            className="fab-menu-item"
            onClick={() => {
              setIsFabMenuOpen(false);
              pdfInputRef.current?.click();
            }}
            disabled={isUploadingPDF}
          >
            {isUploadingPDF ? (
              <>
                <RefreshCw size={20} className="spinning" />
                <span>処理中...</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span>AIで作成</span>
              </>
            )}
          </button>
        </div>
      )}
      
      {/* FABオーバーレイ */}
      {isFabMenuOpen && (
        <div 
          className="fab-overlay"
          onClick={() => setIsFabMenuOpen(false)}
        />
      )}
      
      {/* FABボタン */}
      <button 
        className={`fab ${isFabMenuOpen ? 'active' : ''}`}
        onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
        title="案件を追加"
      >
        <Plus size={24} className={isFabMenuOpen ? 'rotate' : ''} />
      </button>

      {/* ボトムナビゲーション */}
      <MobileBottomNav />

      {/* 案件追加モーダル */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        mode="add"
      />
    </div>
  );
};

export default MobileDashboard;
