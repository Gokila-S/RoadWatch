import { useEffect, useMemo, useState } from 'react'
import useStore from '../../store/useStore'
import './SuperAdmin.css'

const FIELD_RULES = {
  full_name: {
    minLength: 3,
    maxLength: 60,
    pattern: /^[A-Za-z][A-Za-z\s'.-]{2,59}$/,
    message: 'Name must be 3-60 characters and contain only letters, spaces, apostrophes, dots, or hyphens.',
  },
  email: {
    maxLength: 100,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Enter a valid email address.',
  },
  temporary_password: {
    minLength: 8,
    maxLength: 64,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/,
    message: 'Password must be 8-64 chars with uppercase, lowercase, number, and special character.',
  },
  district: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[A-Za-z][A-Za-z\s-]{2,49}$/,
    message: 'District must be 3-50 characters and contain only letters, spaces, and hyphens.',
  },
  phone: {
    minLength: 10,
    maxLength: 15,
    pattern: /^\+?[0-9]{10,15}$/,
    message: 'Phone must be 10-15 digits (optional leading +).',
  },
}

const validateValue = (name, value, { optional = false } = {}) => {
  const rule = FIELD_RULES[name]
  if (!rule) return ''

  const trimmed = String(value || '').trim()
  if (!trimmed) {
    return optional ? '' : `${name.replace('_', ' ')} is required.`
  }

  if (rule.minLength && trimmed.length < rule.minLength) {
    return rule.message
  }

  if (rule.maxLength && trimmed.length > rule.maxLength) {
    return rule.message
  }

  if (rule.pattern && !rule.pattern.test(trimmed)) {
    return rule.message
  }

  return ''
}

const normalizeForSubmit = (payload) => ({
  ...payload,
  full_name: payload.full_name.trim(),
  email: payload.email.trim().toLowerCase(),
  district: payload.district.trim(),
  phone: payload.phone.trim(),
  temporary_password: payload.temporary_password,
})

const initialForm = {
  full_name: '',
  email: '',
  temporary_password: '',
  district: '',
  phone: '',
}

const initialEditForm = {
  id: '',
  full_name: '',
  email: '',
  temporary_password: '',
  district: '',
  phone: '',
  status: 'active',
}

const SuperAdmin = () => {
  const {
    createDistrictAdmin,
    updateDistrictAdmin,
    deleteDistrictAdmin,
    fetchDistrictAdmins,
    districtAdmins,
  } = useStore()

  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editForm, setEditForm] = useState(initialEditForm)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [createErrors, setCreateErrors] = useState({})
  const [editErrors, setEditErrors] = useState({})

  useEffect(() => {
    fetchDistrictAdmins().catch((err) => {
      setError(err.message || 'Could not load district admins')
    })
  }, [fetchDistrictAdmins])

  const districtCount = useMemo(() => {
    return new Set(districtAdmins.map((admin) => admin.district)).size
  }, [districtAdmins])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setCreateErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleBlur = (event) => {
    const { name, value } = event.target
    const nextError = validateValue(name, value)
    setCreateErrors((prev) => ({ ...prev, [name]: nextError }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationErrors = {
      full_name: validateValue('full_name', form.full_name),
      email: validateValue('email', form.email),
      temporary_password: validateValue('temporary_password', form.temporary_password),
      district: validateValue('district', form.district),
      phone: validateValue('phone', form.phone),
    }

    const hasErrors = Object.values(validationErrors).some(Boolean)
    if (hasErrors) {
      setCreateErrors(validationErrors)
      setError('Please fix the highlighted fields.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await createDistrictAdmin(normalizeForSubmit(form))
      setMessage('District admin created successfully.')
      setForm(initialForm)
      setCreateErrors({})
      await fetchDistrictAdmins()
    } catch (err) {
      setError(err.message || 'Failed to create district admin')
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (admin) => {
    setEditForm({
      id: admin.id,
      full_name: admin.full_name,
      email: admin.email,
      temporary_password: '',
      district: admin.district,
      phone: admin.phone,
      status: admin.status || 'active',
    })
    setEditOpen(true)
    setError('')
    setMessage('')
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
    setEditErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleEditBlur = (event) => {
    const { name, value } = event.target
    const isOptionalPassword = name === 'temporary_password'
    const nextError = validateValue(name, value, { optional: isOptionalPassword })
    setEditErrors((prev) => ({ ...prev, [name]: nextError }))
  }

  const submitEdit = async (event) => {
    event.preventDefault()

    const validationErrors = {
      full_name: validateValue('full_name', editForm.full_name),
      email: validateValue('email', editForm.email),
      district: validateValue('district', editForm.district),
      phone: validateValue('phone', editForm.phone),
      temporary_password: validateValue('temporary_password', editForm.temporary_password, { optional: true }),
    }

    const hasErrors = Object.values(validationErrors).some(Boolean)
    if (hasErrors) {
      setEditErrors(validationErrors)
      setError('Please fix the highlighted fields in edit form.')
      return
    }

    setEditing(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        full_name: editForm.full_name,
        email: editForm.email,
        district: editForm.district,
        phone: editForm.phone,
        status: editForm.status,
      }

      if (editForm.temporary_password.trim()) {
        payload.temporary_password = editForm.temporary_password
      }

      await updateDistrictAdmin(editForm.id, normalizeForSubmit(payload))
      setMessage('District admin updated successfully.')
      setEditOpen(false)
      setEditForm(initialEditForm)
      setEditErrors({})
      await fetchDistrictAdmins()
    } catch (err) {
      setError(err.message || 'Failed to update district admin')
    } finally {
      setEditing(false)
    }
  }

  const onDeleteAdmin = async (admin) => {
    const confirmed = window.confirm(`Delete district admin ${admin.full_name}? This action cannot be undone.`)
    if (!confirmed) return

    setError('')
    setMessage('')
    setDeletingId(admin.id)

    try {
      await deleteDistrictAdmin(admin.id)
      setMessage('District admin deleted successfully.')
      await fetchDistrictAdmins()
    } catch (err) {
      setError(err.message || 'Failed to delete district admin')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="super-admin-page container">
      <section className="super-admin-kpis card">
        <div className="super-admin-kpi-item">
          <p>District Admins</p>
          <h3>{districtAdmins.length}</h3>
        </div>
        <div className="super-admin-kpi-item">
          <p>Districts Covered</p>
          <h3>{districtCount}</h3>
        </div>
        <div className="super-admin-kpi-item">
          <p>Active Accounts</p>
          <h3>{districtAdmins.filter((admin) => admin.status === 'active').length}</h3>
        </div>
      </section>

      <section className="super-admin-panel card">
        <div className="super-admin-panel-head">
          <h2 className="heading-display heading-md">District Admin Lifecycle Management</h2>
          <span className="super-admin-chip">Governance Console</span>
        </div>
        <p className="text-secondary">Create, update, and deactivate district administrators with full control.</p>

        {message ? <p className="super-admin-message success">{message}</p> : null}
        {error ? <p className="super-admin-message error">{error}</p> : null}

        <form className="super-admin-form super-admin-form--create" onSubmit={handleSubmit}>
          <div className="super-admin-form-grid">
            <div className="super-admin-field">
              <label className="input-label" htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                name="full_name"
                className={`input-field ${createErrors.full_name ? 'input-error' : ''}`}
                value={form.full_name}
                onChange={handleChange}
                onBlur={handleBlur}
                minLength={FIELD_RULES.full_name.minLength}
                maxLength={FIELD_RULES.full_name.maxLength}
                required
              />
              {createErrors.full_name ? <p className="field-error">{createErrors.full_name}</p> : null}
            </div>

            <div className="super-admin-field">
              <label className="input-label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className={`input-field ${createErrors.email ? 'input-error' : ''}`}
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={FIELD_RULES.email.maxLength}
                required
              />
              {createErrors.email ? <p className="field-error">{createErrors.email}</p> : null}
            </div>

            <div className="super-admin-field">
              <label className="input-label" htmlFor="district">District</label>
              <input
                id="district"
                name="district"
                className={`input-field ${createErrors.district ? 'input-error' : ''}`}
                value={form.district}
                onChange={handleChange}
                onBlur={handleBlur}
                minLength={FIELD_RULES.district.minLength}
                maxLength={FIELD_RULES.district.maxLength}
                required
              />
              {createErrors.district ? <p className="field-error">{createErrors.district}</p> : null}
            </div>

            <div className="super-admin-field">
              <label className="input-label" htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                className={`input-field ${createErrors.phone ? 'input-error' : ''}`}
                value={form.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                minLength={FIELD_RULES.phone.minLength}
                maxLength={FIELD_RULES.phone.maxLength}
                required
              />
              {createErrors.phone ? <p className="field-error">{createErrors.phone}</p> : null}
            </div>

            <div className="super-admin-field super-admin-field-full">
              <label className="input-label" htmlFor="temporary_password">Temporary Password</label>
              <input
                id="temporary_password"
                name="temporary_password"
                type="password"
                className={`input-field ${createErrors.temporary_password ? 'input-error' : ''}`}
                value={form.temporary_password}
                onChange={handleChange}
                onBlur={handleBlur}
                minLength={FIELD_RULES.temporary_password.minLength}
                maxLength={FIELD_RULES.temporary_password.maxLength}
                required
              />
              {createErrors.temporary_password ? <p className="field-error">{createErrors.temporary_password}</p> : null}
            </div>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create District Admin'}
          </button>
        </form>
      </section>

      <section className="super-admin-list card">
        <h3 className="heading-display heading-sm">District Admin Directory</h3>
        <p className="super-admin-list-subtitle">Use edit and status controls to keep district ownership accurate and active.</p>
        {districtAdmins.length === 0 ? (
          <p className="text-dim">No district admins yet.</p>
        ) : (
          <div className="super-admin-table-wrap" id="directory">
            <table className="super-admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>District</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {districtAdmins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.full_name}</td>
                    <td>{admin.email}</td>
                    <td>{admin.district}</td>
                    <td>{admin.phone}</td>
                    <td>
                      <span className={`status-pill ${admin.status === 'active' ? 'active' : 'inactive'}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="admin-actions">
                      <button className="btn btn-sm" type="button" onClick={() => openEdit(admin)}>Edit</button>
                      <button className="btn btn-sm btn-danger" type="button" onClick={() => onDeleteAdmin(admin)} disabled={deletingId === admin.id}>
                        {deletingId === admin.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editOpen ? (
        <div className="super-admin-modal-backdrop" onClick={() => setEditOpen(false)}>
          <div className="super-admin-modal card" onClick={(event) => event.stopPropagation()}>
            <div className="super-admin-modal-head">
              <h3 className="heading-display heading-sm">Edit District Admin</h3>
            </div>
            <form className="super-admin-form super-admin-form--modal" onSubmit={submitEdit}>
              <div className="super-admin-form-grid super-admin-form-grid--modal">
                <div className="super-admin-field">
                  <label className="input-label" htmlFor="edit_full_name">Full Name</label>
                  <input
                    id="edit_full_name"
                    name="full_name"
                    className={`input-field ${editErrors.full_name ? 'input-error' : ''}`}
                    value={editForm.full_name}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    minLength={FIELD_RULES.full_name.minLength}
                    maxLength={FIELD_RULES.full_name.maxLength}
                    required
                  />
                  {editErrors.full_name ? <p className="field-error">{editErrors.full_name}</p> : null}
                </div>

                <div className="super-admin-field">
                  <label className="input-label" htmlFor="edit_email">Email</label>
                  <input
                    id="edit_email"
                    name="email"
                    type="email"
                    className={`input-field ${editErrors.email ? 'input-error' : ''}`}
                    value={editForm.email}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    maxLength={FIELD_RULES.email.maxLength}
                    required
                  />
                  {editErrors.email ? <p className="field-error">{editErrors.email}</p> : null}
                </div>

                <div className="super-admin-field">
                  <label className="input-label" htmlFor="edit_phone">Phone</label>
                  <input
                    id="edit_phone"
                    name="phone"
                    className={`input-field ${editErrors.phone ? 'input-error' : ''}`}
                    value={editForm.phone}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    minLength={FIELD_RULES.phone.minLength}
                    maxLength={FIELD_RULES.phone.maxLength}
                    required
                  />
                  {editErrors.phone ? <p className="field-error">{editErrors.phone}</p> : null}
                </div>

                <div className="super-admin-field">
                  <label className="input-label" htmlFor="edit_district">District</label>
                  <input
                    id="edit_district"
                    name="district"
                    className={`input-field ${editErrors.district ? 'input-error' : ''}`}
                    value={editForm.district}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    minLength={FIELD_RULES.district.minLength}
                    maxLength={FIELD_RULES.district.maxLength}
                    required
                  />
                  {editErrors.district ? <p className="field-error">{editErrors.district}</p> : null}
                </div>

                <div className="super-admin-field">
                  <label className="input-label" htmlFor="edit_status">Status</label>
                  <select id="edit_status" name="status" className="input-field" value={editForm.status} onChange={handleEditChange}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>

                <div className="super-admin-field">
                  <label className="input-label" htmlFor="edit_temp_password">Reset Password (Optional)</label>
                  <input
                    id="edit_temp_password"
                    name="temporary_password"
                    type="password"
                    className={`input-field ${editErrors.temporary_password ? 'input-error' : ''}`}
                    value={editForm.temporary_password}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    minLength={FIELD_RULES.temporary_password.minLength}
                    maxLength={FIELD_RULES.temporary_password.maxLength}
                  />
                  {editErrors.temporary_password ? <p className="field-error">{editErrors.temporary_password}</p> : null}
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setEditOpen(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={editing}>{editing ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default SuperAdmin
