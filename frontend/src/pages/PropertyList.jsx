import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PropertyFormModal from '../components/PropertyFormModal';
import ConfirmModal from '../components/ConfirmModal';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(price);
};

export default function PropertyList() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await propertyApi.getAll();
      setProperties(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handleCreate = () => {
    setEditTarget(null);
    setShowForm(true);
  };

  const handleEdit = (property) => {
    setEditTarget(property);
    setShowForm(true);
  };

  const handleDeleteConfirm = (property) => {
    setDeleteTarget(property);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await propertyApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadProperties();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditTarget(null);
    loadProperties();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* ヘッダー */}
      <header className="header">
        <div className="header-inner">
          <div className="header-left">
            <span className="header-icon">🏠</span>
            <h1 className="header-title">不動産管理ソフト</h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className={`role-badge ${isAdmin ? 'role-admin' : 'role-user'}`}>
                {isAdmin ? '管理者' : '利用ユーザー'}
              </span>
              <span className="user-name">{user?.name}</span>
            </div>
            <button className="btn btn-outline" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="main-content">
        <div className="page-header">
          <h2 className="page-title">物件一覧</h2>
          {isAdmin && (
            <button className="btn btn-primary" onClick={handleCreate}>
              ＋ 新規登録
            </button>
          )}
        </div>

        {error && (
          <div className="error-alert">
            <span>⚠️</span> {error}
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>読み込み中...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏠</div>
            <p className="empty-title">物件が登録されていません</p>
            {isAdmin && (
              <button className="btn btn-primary" onClick={handleCreate}>
                最初の物件を登録する
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>物件名</th>
                  <th>金額</th>
                  <th>PDF数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="property-name">{p.name}</span>
                    </td>
                    <td>
                      <span className="property-price">{formatPrice(p.price)}</span>
                    </td>
                    <td>
                      <span className={`pdf-count-badge ${p.pdfCount >= 5 ? 'pdf-count-full' : ''}`}>
                        📄 {p.pdfCount} / 5
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate(`/properties/${p.id}`)}
                        >
                          詳細
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => handleEdit(p)}
                            >
                              編集
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteConfirm(p)}
                            >
                              削除
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* 物件登録・編集モーダル */}
      {showForm && (
        <PropertyFormModal
          property={editTarget}
          onSuccess={handleFormSuccess}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <ConfirmModal
          title="物件の削除"
          message={`「${deleteTarget.name}」を削除しますか？\n関連するPDFも全て削除されます。`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={actionLoading}
          danger
        />
      )}
    </div>
  );
}
