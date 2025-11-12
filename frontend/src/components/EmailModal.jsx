import { useState } from "react";
import { X, Copy, Check, Mail, Loader2 } from "lucide-react";
import "../styles/EmailModal.css";

const EmailModal = ({ isOpen, onClose, email, isGenerating }) => {
  const [copied, setCopied] = useState(false);
  const [editableSubject, setEditableSubject] = useState(email?.subject || "");
  const [editableBody, setEditableBody] = useState(email?.body || "");

  // モーダルが閉じられている場合は何も表示しない
  if (!isOpen) return null;

  // メールデータが更新されたら編集可能フィールドも更新
  if (email && email.subject !== editableSubject) {
    setEditableSubject(email.subject);
    setEditableBody(email.body);
  }

  // 全文をクリップボードにコピー
  const handleCopyAll = async () => {
    const fullText = `件名: ${editableSubject}\n\n${editableBody}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  };

  // 件名をコピー
  const handleCopySubject = async () => {
    try {
      await navigator.clipboard.writeText(editableSubject);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  };

  // 本文をコピー
  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(editableBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  };

  // 背景クリックでモーダルを閉じる
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="email-modal-backdrop" onClick={handleBackdropClick}>
      <div className="email-modal">
        {/* ヘッダー */}
        <div className="email-modal-header">
          <div className="email-modal-title">
            <Mail size={24} />
            <h2>AI連絡メール</h2>
          </div>
          <button className="email-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="email-modal-content">
          {isGenerating ? (
            // ローディング状態
            <div className="email-generating">
              <Loader2 size={48} className="spinning" />
              <p>AIがメールを生成しています...</p>
              <span className="generating-hint">
                案件情報を分析して最適な文面を作成中
              </span>
            </div>
          ) : (
            <>
              {/* 件名 */}
              <div className="email-field">
                <div className="email-field-header">
                  <label>件名</label>
                  <button
                    className="copy-button-small"
                    onClick={handleCopySubject}
                    title="件名をコピー"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <input
                  type="text"
                  value={editableSubject}
                  onChange={(e) => setEditableSubject(e.target.value)}
                  className="email-subject-input"
                  placeholder="件名を入力..."
                />
              </div>

              {/* 本文 */}
              <div className="email-field">
                <div className="email-field-header">
                  <label>本文</label>
                  <button
                    className="copy-button-small"
                    onClick={handleCopyBody}
                    title="本文をコピー"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <textarea
                  value={editableBody}
                  onChange={(e) => setEditableBody(e.target.value)}
                  className="email-body-textarea"
                  placeholder="本文を入力..."
                  rows={15}
                />
              </div>

              {/* 使用方法のヒント */}
              <div className="email-hint">
                💡 ヒント: 生成された内容を編集して、メールクライアントにコピー＆ペーストできます
              </div>
            </>
          )}
        </div>

        {/* フッター */}
        {!isGenerating && (
          <div className="email-modal-footer">
            <button className="email-cancel-button" onClick={onClose}>
              閉じる
            </button>
            <button className="email-copy-button" onClick={handleCopyAll}>
              {copied ? (
                <>
                  <Check size={20} />
                  コピーしました！
                </>
              ) : (
                <>
                  <Copy size={20} />
                  全文をコピー
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailModal;
