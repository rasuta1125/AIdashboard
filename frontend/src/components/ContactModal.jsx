import { useState, useEffect } from "react";
import { X, User, Phone, Mail as MailIcon, Briefcase } from "lucide-react";
import "../styles/ContactModal.css";

const ContactModal = ({ isOpen, onClose, onSave, contact = null, mode = "add" }) => {
  const [formData, setFormData] = useState({
    name: "",
    role: "買主",
    phone: "",
    email: "",
    company: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (contact && mode === "edit") {
      setFormData({
        name: contact.name || "",
        role: contact.role || "買主",
        phone: contact.phone || "",
        email: contact.email || "",
        company: contact.company || "",
      });
    } else if (mode === "add") {
      // Reset form when adding new contact
      setFormData({
        name: "",
        role: "買主",
        phone: "",
        email: "",
        company: "",
      });
    }
    setErrors({});
  }, [contact, mode, isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "お名前は必須です";
    }

    if (!formData.role) {
      newErrors.role = "役割は必須です";
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = "有効なメールアドレスを入力してください";
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = "有効な電話番号を入力してください（例: 03-1234-5678）";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone) => {
    // 日本の電話番号形式（ハイフンあり・なし両方対応）
    const phoneRegex = /^[\d-]{10,13}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const contactData = {
      ...formData,
      contact_id: contact?.contact_id || Date.now(), // 新規の場合は一時ID
    };

    onSave(contactData);
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const roleOptions = [
    "買主",
    "売主",
    "買主代理人",
    "売主代理人",
    "司法書士",
    "金融機関担当者",
    "仲介業者",
    "その他",
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {mode === "edit" ? "関係者情報を編集" : "関係者を追加"}
          </h2>
          <button className="modal-close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-group">
            <label htmlFor="name">
              <User size={18} />
              お名前 <span className="required">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="例: 山田太郎"
              className={errors.name ? "error" : ""}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="role">
              <Briefcase size={18} />
              役割 <span className="required">*</span>
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              className={errors.role ? "error" : ""}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.role && <span className="error-message">{errors.role}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="company">
              <Briefcase size={18} />
              会社名・所属
            </label>
            <input
              id="company"
              type="text"
              value={formData.company}
              onChange={(e) => handleChange("company", e.target.value)}
              placeholder="例: 株式会社サンプル不動産"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">
              <Phone size={18} />
              電話番号
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="例: 03-1234-5678"
              className={errors.phone ? "error" : ""}
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <MailIcon size={18} />
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="例: yamada@example.com"
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="save-button">
              {mode === "edit" ? "更新" : "追加"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;
