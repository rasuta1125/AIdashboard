import { useState } from 'react';
import { propertyApi } from '../utils/api';

export default function PropertyFormModal({ property, onSuccess, onClose }) {
  const isEdit = !!property;
  const [name, setName] = useState(property?.name || '');
  const [price, setPrice] = useState(property?.price !== undefined ? String(property.price) : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('物件名を入力してください');
      return;
    }
    if (price === '' || isNaN(Number(price)) || Number(price) < 0) {
      setError('有効な金額を入力してください');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await propertyApi.update(property.id, { name: name.trim(), price: Number(price) });
      } else {
        await propertyApi.create({ name: name.trim(), price: Number(price) });
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isEdit ? '物件を編集' : '新規物件登録'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-alert">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="prop-name">物件名 <span className="required">*</span></label>
            <input
              id="prop-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="物件名を入力"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="prop-price">金額（円） <span className="required">*</span></label>
            <input
              id="prop-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="例：50000000"
              min="0"
              step="1"
              disabled={loading}
            />
            {price !== '' && !isNaN(Number(price)) && (
              <span className="price-preview">
                {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(Number(price))}
              </span>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
              キャンセル
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '保存中...' : isEdit ? '更新する' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
