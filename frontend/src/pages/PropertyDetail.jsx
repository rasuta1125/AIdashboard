import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyApi, pdfApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import PropertyFormModal from '../components/PropertyFormModal';
import PdfViewer from '../components/PdfViewer';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(price);
};

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const fileInputRef = useRef(null);

  const [property, setProperty] = useState(null);
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deletePdfTarget, setDeletePdfTarget] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [viewingPdf, setViewingPdf] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadProperty = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await propertyApi.getById(id);
      setProperty(res.data);
      setPdfs(res.data.pdfs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    if (file.type !== 'application/pdf') {
      showToast('PDFファイルのみアップロード可能です', 'error');
      return;
    }

    if (pdfs.length >= 5) {
      showToast('PDFは最大5個までです', 'error');
      return;
    }

    setUploadLoading(true);
    try {
      await pdfApi.upload(id, file);
      showToast('PDFをアップロードしました');
      loadProperty();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeletePdf = async () => {
    if (!deletePdfTarget) return;
    setActionLoading(true);
    try {
      await pdfApi.delete(deletePdfTarget.id);
      setDeletePdfTarget(null);
      showToast('PDFを削除しました');
      loadProperty();
    } catch (err) {
      showToast(err.message, 'error');
      setDeletePdfTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async (pdf) => {
    try {
      await pdfApi.download(pdf.id, pdf.originalName);
      showToast('ダウンロードを開始しました');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleView = (pdf) => {
    setViewingPdf(pdf);
  };

  if (loading) {
    return (
      <div className="app-layout">
        <div className="loading-container" style={{ minHeight: '100vh' }}>
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-layout">
        <main className="main-content">
          <div className="error-alert">⚠️ {error}</div>
          <button className="btn btn-outline" onClick={() => navigate('/properties')}>
            ← 一覧に戻る
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* ヘッダー */}
      <header className="header">
        <div className="header-inner">
          <div className="header-left">
            <button className="btn btn-ghost" onClick={() => navigate('/properties')}>
              ← 一覧に戻る
            </button>
          </div>
          <div className="header-right">
            <span className="header-icon">🏠</span>
            <span className="header-title">不動産管理ソフト</span>
          </div>
        </div>
      </header>

      {/* トースト通知 */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.message}
        </div>
      )}

      <main className="main-content">
        {/* 物件基本情報 */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h2 className="detail-title">{property?.name}</h2>
            {isAdmin && (
              <button className="btn btn-outline" onClick={() => setShowEditForm(true)}>
                編集
              </button>
            )}
          </div>
          <div className="detail-info-grid">
            <div className="detail-info-item">
              <span className="detail-info-label">金額</span>
              <span className="detail-info-value price-value">{formatPrice(property?.price)}</span>
            </div>
            <div className="detail-info-item">
              <span className="detail-info-label">PDF数</span>
              <span className="detail-info-value">{pdfs.length} / 5</span>
            </div>
            <div className="detail-info-item">
              <span className="detail-info-label">登録日</span>
              <span className="detail-info-value">
                {property?.createdAt ? new Date(property.createdAt).toLocaleDateString('ja-JP') : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* PDFセクション */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h3 className="section-title">📄 PDFファイル一覧</h3>
            {isAdmin && (
              <div className="pdf-upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading || pdfs.length >= 5}
                >
                  {uploadLoading ? 'アップロード中...' : '＋ PDF追加'}
                </button>
                {pdfs.length >= 5 && (
                  <span className="limit-note">最大件数に達しています</span>
                )}
              </div>
            )}
          </div>

          {pdfs.length === 0 ? (
            <div className="empty-state empty-state-small">
              <p>📄 PDFが登録されていません</p>
              {isAdmin && <p className="hint">「PDF追加」ボタンからアップロードしてください</p>}
            </div>
          ) : (
            <div className="pdf-list">
              {pdfs.map((pdf, idx) => (
                <div key={pdf.id} className="pdf-item">
                  <div className="pdf-item-left">
                    <span className="pdf-index">{idx + 1}</span>
                    <span className="pdf-icon">📄</span>
                    <div className="pdf-info">
                      <span className="pdf-name">{pdf.originalName}</span>
                      <span className="pdf-date">
                        {new Date(pdf.uploadedAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                  <div className="pdf-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleView(pdf)}
                    >
                      閲覧
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleDownload(pdf)}
                    >
                      保存
                    </button>
                    {isAdmin && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setDeletePdfTarget(pdf)}
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 物件編集モーダル */}
      {showEditForm && (
        <PropertyFormModal
          property={property}
          onSuccess={() => { setShowEditForm(false); loadProperty(); }}
          onClose={() => setShowEditForm(false)}
        />
      )}

      {/* PDF削除確認 */}
      {deletePdfTarget && (
        <ConfirmModal
          title="PDFの削除"
          message={`「${deletePdfTarget.originalName}」を削除しますか？`}
          onConfirm={handleDeletePdf}
          onCancel={() => setDeletePdfTarget(null)}
          loading={actionLoading}
          danger
        />
      )}

      {/* PDFビューアー */}
      {viewingPdf && (
        <PdfViewer
          pdf={viewingPdf}
          onClose={() => setViewingPdf(null)}
        />
      )}
    </div>
  );
}
