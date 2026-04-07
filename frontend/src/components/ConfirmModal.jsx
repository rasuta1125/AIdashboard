export default function ConfirmModal({ title, message, onConfirm, onCancel, loading, danger }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-confirm">
        <div className="modal-header">
          <h2>{danger ? '⚠️ ' : ''}{title}</h2>
        </div>

        <div className="modal-body">
          <p style={{ whiteSpace: 'pre-line' }}>{message}</p>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-outline"
            onClick={onCancel}
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '処理中...' : '確認'}
          </button>
        </div>
      </div>
    </div>
  );
}
