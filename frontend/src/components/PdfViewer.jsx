import { useState, useEffect } from 'react';
import { pdfApi } from '../utils/api';

export default function PdfViewer({ pdf, onClose }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let objectUrl = null;
    setLoading(true);
    setError('');

    pdfApi.view(pdf.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdf.id]);

  const handleDownload = async () => {
    try {
      await pdfApi.download(pdf.id, pdf.originalName);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay pdf-viewer-overlay">
      <div className="pdf-viewer-modal">
        <div className="pdf-viewer-header">
          <div className="pdf-viewer-title">
            <span>📄</span>
            <span>{pdf.originalName}</span>
          </div>
          <div className="pdf-viewer-actions">
            <button className="btn btn-sm btn-outline" onClick={handleDownload}>
              保存
            </button>
            <button className="btn btn-sm btn-ghost" onClick={onClose}>
              ✕ 閉じる
            </button>
          </div>
        </div>

        <div className="pdf-viewer-body">
          {loading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>PDFを読み込み中...</p>
            </div>
          )}
          {error && (
            <div className="error-alert">⚠️ {error}</div>
          )}
          {pdfUrl && !loading && (
            <iframe
              src={pdfUrl}
              title={pdf.originalName}
              className="pdf-iframe"
              frameBorder="0"
            />
          )}
        </div>
      </div>
    </div>
  );
}
