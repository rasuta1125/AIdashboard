import { useState, useEffect } from "react";
import { X, FileText, User, Calendar, DollarSign, AlertCircle } from "lucide-react";
import "../styles/ProjectModal.css";

const ProjectModal = ({ isOpen, onClose, onSave, project = null, mode = "add" }) => {
  const [formData, setFormData] = useState({
    project_name: "",
    buyer_name: "",
    seller_name: "",
    property_address: "",
    property_price: "",
    deposit_amount: "",
    contract_date: "",
    settlement_date: "",
    loan_special_clause_deadline: "",
    status: "契約前",
    sales_rep_id: 1,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (project && mode === "edit") {
      setFormData({
        project_name: project.project_name || "",
        buyer_name: project.buyer_name || "",
        seller_name: project.seller_name || "",
        property_address: project.property_address || "",
        property_price: project.property_price || "",
        deposit_amount: project.deposit_amount || "",
        contract_date: project.contract_date || "",
        settlement_date: project.settlement_date || "",
        loan_special_clause_deadline: project.loan_special_clause_deadline || "",
        status: project.status || "契約前",
        sales_rep_id: project.sales_rep_id || 1,
      });
    } else if (mode === "add") {
      // Reset form when adding new project
      setFormData({
        project_name: "",
        buyer_name: "",
        seller_name: "",
        property_address: "",
        property_price: "",
        deposit_amount: "",
        contract_date: "",
        settlement_date: "",
        loan_special_clause_deadline: "",
        status: "契約前",
        sales_rep_id: 1,
      });
    }
    setErrors({});
  }, [project, mode, isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.project_name.trim()) {
      newErrors.project_name = "案件名は必須です";
    }

    if (!formData.buyer_name.trim()) {
      newErrors.buyer_name = "買主名は必須です";
    }

    if (formData.property_price && isNaN(Number(formData.property_price))) {
      newErrors.property_price = "売買代金は数値で入力してください";
    }

    if (formData.deposit_amount && isNaN(Number(formData.deposit_amount))) {
      newErrors.deposit_amount = "手付金は数値で入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const projectData = {
      ...formData,
      project_id: project?.project_id || Date.now(),
      property_price: formData.property_price ? Number(formData.property_price) : null,
      deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : null,
      created_at: project?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(projectData);
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const statusOptions = [
    "契約前",
    "契約済み",
    "融資承認待ち",
    "決済準備中",
    "決済完了",
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {mode === "edit" ? "案件を編集" : "新規案件を作成"}
          </h2>
          <button className="modal-close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-section">
            <h3>基本情報</h3>
            
            <div className="form-group">
              <label htmlFor="project_name">
                <FileText size={18} />
                案件名 <span className="required">*</span>
              </label>
              <input
                id="project_name"
                type="text"
                value={formData.project_name}
                onChange={(e) => handleChange("project_name", e.target.value)}
                placeholder="例: 渋谷区マンション売買"
                className={errors.project_name ? "error" : ""}
              />
              {errors.project_name && <span className="error-message">{errors.project_name}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="buyer_name">
                  <User size={18} />
                  買主 <span className="required">*</span>
                </label>
                <input
                  id="buyer_name"
                  type="text"
                  value={formData.buyer_name}
                  onChange={(e) => handleChange("buyer_name", e.target.value)}
                  placeholder="例: 山田太郎"
                  className={errors.buyer_name ? "error" : ""}
                />
                {errors.buyer_name && <span className="error-message">{errors.buyer_name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="seller_name">
                  <User size={18} />
                  売主
                </label>
                <input
                  id="seller_name"
                  type="text"
                  value={formData.seller_name}
                  onChange={(e) => handleChange("seller_name", e.target.value)}
                  placeholder="例: 佐藤花子"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="property_address">
                <FileText size={18} />
                物件住所
              </label>
              <input
                id="property_address"
                type="text"
                value={formData.property_address}
                onChange={(e) => handleChange("property_address", e.target.value)}
                placeholder="例: 東京都渋谷区〇〇1-2-3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">
                <FileText size={18} />
                ステータス
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>金額情報</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="property_price">
                  <DollarSign size={18} />
                  売買代金（円）
                </label>
                <input
                  id="property_price"
                  type="text"
                  value={formData.property_price}
                  onChange={(e) => handleChange("property_price", e.target.value)}
                  placeholder="例: 50000000"
                  className={errors.property_price ? "error" : ""}
                />
                {errors.property_price && <span className="error-message">{errors.property_price}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="deposit_amount">
                  <DollarSign size={18} />
                  手付金（円）
                </label>
                <input
                  id="deposit_amount"
                  type="text"
                  value={formData.deposit_amount}
                  onChange={(e) => handleChange("deposit_amount", e.target.value)}
                  placeholder="例: 5000000"
                  className={errors.deposit_amount ? "error" : ""}
                />
                {errors.deposit_amount && <span className="error-message">{errors.deposit_amount}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>重要日程</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contract_date">
                  <Calendar size={18} />
                  契約日
                </label>
                <input
                  id="contract_date"
                  type="date"
                  value={formData.contract_date}
                  onChange={(e) => handleChange("contract_date", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="settlement_date">
                  <Calendar size={18} />
                  決済日
                </label>
                <input
                  id="settlement_date"
                  type="date"
                  value={formData.settlement_date}
                  onChange={(e) => handleChange("settlement_date", e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="loan_special_clause_deadline">
                <AlertCircle size={18} />
                融資特約期限
              </label>
              <input
                id="loan_special_clause_deadline"
                type="date"
                value={formData.loan_special_clause_deadline}
                onChange={(e) => handleChange("loan_special_clause_deadline", e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="save-button">
              {mode === "edit" ? "更新" : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
