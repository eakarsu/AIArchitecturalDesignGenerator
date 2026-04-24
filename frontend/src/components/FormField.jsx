export default function FormField({ label, name, type = 'text', value, onChange, options = [], placeholder = '', required = false }) {
  const id = `field-${name}`;

  if (type === 'textarea') {
    return (
      <div className="mb-4">
        <label htmlFor={id} className="form-label">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
        <textarea
          id={id}
          name={name}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={4}
          className="form-input resize-y"
        />
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className="mb-4">
        <label htmlFor={id} className="form-label">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
        <select
          id={id}
          name={name}
          value={value || ''}
          onChange={onChange}
          required={required}
          className="form-select"
        >
          <option value="">Select {label}</option>
          {options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lbl = typeof opt === 'string' ? opt : opt.label;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label htmlFor={id} className="form-label">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
      <input
        id={id}
        name={name}
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="form-input"
      />
    </div>
  );
}
