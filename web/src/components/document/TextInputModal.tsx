import React, { useState, useEffect } from "react";
import { X, Mail, Type, Building2, Phone, MapPin, Hash, Check } from "lucide-react";

interface TextInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  fieldType: string;
  initialValue?: string;
  defaultEmail?: string;
}

export default function TextInputModal({
  isOpen,
  onClose,
  onSave,
  fieldType,
  initialValue = "",
  defaultEmail = "",
}: TextInputModalProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialValue) {
        setValue(initialValue);
      } else if (fieldType === "EMAIL" && defaultEmail) {
        setValue(defaultEmail);
      } else {
        setValue("");
      }
    }
  }, [isOpen, initialValue, fieldType, defaultEmail]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSave(value.trim());
    onClose();
  };

  const getModalMeta = () => {
    switch (fieldType) {
      case "EMAIL":
        return {
          title: "Enter Email Address",
          subtitle: "Type your email address to confirm.",
          icon: <Mail className="text-brand-600" size={24} />,
          placeholder: "e.g. client@example.com",
          inputType: "email",
        };
      case "PHONE":
        return {
          title: "Enter Phone Number",
          subtitle: "Type your contact phone number.",
          icon: <Phone className="text-brand-600" size={24} />,
          placeholder: "e.g. +1 (555) 000-0000",
          inputType: "tel",
        };
      case "COMPANY":
        return {
          title: "Enter Company Name",
          subtitle: "Type your organization or business name.",
          icon: <Building2 className="text-brand-600" size={24} />,
          placeholder: "e.g. Acme Corp",
          inputType: "text",
        };
      case "ADDRESS":
        return {
          title: "Enter Full Address",
          subtitle: "Type your street or business address.",
          icon: <MapPin className="text-brand-600" size={24} />,
          placeholder: "e.g. 123 Business Way, Suite 100",
          inputType: "text",
        };
      case "NUMBER":
        return {
          title: "Enter Number",
          subtitle: "Type numerical value or amount.",
          icon: <Hash className="text-brand-600" size={24} />,
          placeholder: "e.g. 100",
          inputType: "number",
        };
      default:
        return {
          title: `Enter ${fieldType}`,
          subtitle: `Type your information for this field.`,
          icon: <Type className="text-brand-600" size={24} />,
          placeholder: "Type here...",
          inputType: "text",
        };
    }
  };

  const meta = getModalMeta();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              {meta.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-surface-900">{meta.title}</h3>
              <p className="text-xs text-surface-500">{meta.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-2">
              {fieldType} VALUE
            </label>
            <input
              type={meta.inputType}
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={meta.placeholder}
              className="w-full px-4 py-3 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-medium text-surface-900 bg-surface-50/50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-surface-300 text-surface-700 hover:bg-surface-100 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition-all"
            >
              <Check size={16} /> Save Value
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
