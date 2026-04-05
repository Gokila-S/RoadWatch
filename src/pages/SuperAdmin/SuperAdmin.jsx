import { useEffect, useState } from 'react'
import useStore from '../../store/useStore'
import './SuperAdmin.css'

const initialForm = {
  full_name: '',
  email: '',
  temporary_password: '',
  district: '',
  phone: '',
}

const SuperAdmin = () => {
  const { createDistrictAdmin, fetchDistrictAdmins, districtAdmins } = useStore()
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDistrictAdmins().catch((err) => {
      setError(err.message || 'Could not load district admins')
    })
  }, [fetchDistrictAdmins])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await createDistrictAdmin(form)
      setMessage('District admin created successfully.')
      setForm(initialForm)
      await fetchDistrictAdmins()
    } catch (err) {
      setError(err.message || 'Failed to create district admin')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="super-admin-page container">
      <section className="super-admin-panel card">
        <h2 className="heading-display heading-md">Super Admin Control</h2>
        <p className="text-secondary">Create and manage district admin accounts.</p>

        {message ? <p className="super-admin-message success">{message}</p> : null}
        {error ? <p className="super-admin-message error">{error}</p> : null}

        <form className="super-admin-form" onSubmit={handleSubmit}>
          <label className="input-label" htmlFor="full_name">Full Name</label>
          <input id="full_name" name="full_name" className="input-field" value={form.full_name} onChange={handleChange} required />

          <label className="input-label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input-field" value={form.email} onChange={handleChange} required />

          <label className="input-label" htmlFor="temporary_password">Temporary Password</label>
          <input id="temporary_password" name="temporary_password" type="password" className="input-field" value={form.temporary_password} onChange={handleChange} required />

          <label className="input-label" htmlFor="district">District</label>
          <input id="district" name="district" className="input-field" value={form.district} onChange={handleChange} required />

          <label className="input-label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" className="input-field" value={form.phone} onChange={handleChange} required />

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create District Admin'}
          </button>
        </form>
      </section>

      <section className="super-admin-list card">
        <h3 className="heading-display heading-sm">District Admins</h3>
        {districtAdmins.length === 0 ? (
          <p className="text-dim">No district admins yet.</p>
        ) : (
          <div className="super-admin-table-wrap">
            <table className="super-admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>District</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {districtAdmins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.full_name}</td>
                    <td>{admin.email}</td>
                    <td>{admin.district}</td>
                    <td>{admin.phone}</td>
                    <td>{admin.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default SuperAdmin
