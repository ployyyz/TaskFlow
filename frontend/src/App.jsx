
import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'https://taskflow-backend-nlga.onrender.com/api'

function App() {
  // Authentication
  const [token, setToken] = useState(
    () => localStorage.getItem('taskflow_token')
  )
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('taskflow_user')
    return saved ? JSON.parse(saved) : null
  })

  const [authMode, setAuthMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Tasks
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('Pending')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Load tasks after login
 useEffect(() => {
  if (token) {
    loadTasks()
    loadUsers()
  }
}, [token])

  async function loadTasks() {
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load tasks')
      }

    setTasks(data.map(task => ({
  ...task,
  dueDate: task.due_date
    ? String(task.due_date).replace(' ', 'T').slice(0, 16)
    : '',
  category: task.category || '',
  assignedUserId: task.assigned_user_id
    ? String(task.assigned_user_id)
    : '',
  assignedUserName: task.assigned_user_name || ''
})))
    } catch (error) {
      setMessage(error.message)
    }
  }
// Load users for task assignment
async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load users')
    }

    setUsers(data)
  } catch (error) {
    setMessage(error.message)
  }
}
  // Register and Login
  async function handleAuth(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const endpoint = authMode === 'login'
      ? '/login'
      : '/register'

    const body = authMode === 'login'
      ? { email, password }
      : { name, email, password }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed')
      }

      if (authMode === 'register') {
        setMessage('Registration successful! Please log in.')
        setAuthMode('login')
        setName('')
        setPassword('')
      } else {
        localStorage.setItem('taskflow_token', data.token)
        localStorage.setItem(
          'taskflow_user',
          JSON.stringify(data.user)
        )

        setUser(data.user)
        setToken(data.token)
        setPassword('')
        setMessage('')
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
  localStorage.removeItem('taskflow_token')
  localStorage.removeItem('taskflow_user')

  setToken(null)
  setUser(null)
  setTasks([])
  setMessage('')
  resetForm()
}

  // Task form
  function resetForm() {
    setTitle('')
    setCategory('')
    setDueDate('')
    setStatus('Pending')
    setAssignedUserId('')
    setEditingId(null)
    setShowForm(false)
  }

  function handleAddClick() {
    resetForm()
    setShowForm(true)
  }

  function handleEdit(task) {
  setTitle(task.title)
  setCategory(task.category || '')
  setDueDate(task.dueDate || '')
  setStatus(task.status)
  setAssignedUserId(
    task.assignedUserId
      ? String(task.assignedUserId)
      : ''
  )
  setEditingId(task.id)
  setShowForm(true)
}

  // Add and Update Task
  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const taskData = {
  title,
  category,
  due_date: dueDate
    ? `${dueDate.replace('T', ' ')}:00`
    : null,
  status,
  assigned_user_id: assignedUserId || null,
}

    const isEditing = editingId !== null

    try {
      const response = await fetch(
        isEditing
          ? `${API_URL}/tasks/${editingId}`
          : `${API_URL}/tasks`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(taskData),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save task')
      }

      resetForm()
      await loadTasks()
      setMessage(data.message)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Delete Task
  async function handleDelete(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this task?'
    )

    if (!confirmed) return

    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete task')
      }

      await loadTasks()
      setMessage(data.message)

      if (editingId === id) {
        resetForm()
      }
    } catch (error) {
      setMessage(error.message)
    }
  }

  // Dashboard statistics
  const completed = tasks.filter(
    task => task.status === 'Completed'
  ).length

  const inProgress = tasks.filter(
    task => task.status === 'In Progress'
  ).length

  const pending = tasks.filter(
    task => task.status === 'Pending'
  ).length

  // Search and filter
  const filteredTasks = tasks.filter(task => {
    const keyword = searchTerm.toLowerCase()

    const matchesSearch =
      task.title.toLowerCase().includes(keyword) ||
      (task.category || '').toLowerCase().includes(keyword)

    const matchesStatus =
      filterStatus === 'All' ||
      task.status === filterStatus

    return matchesSearch && matchesStatus
  })

  // Login / Register screen
  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f7f5',
        padding: '20px',
      }}>
        <form
          onSubmit={handleAuth}
          style={{
            background: 'white',
            padding: '35px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <h1 style={{
            color: '#26734d',
            textAlign: 'center',
            marginBottom: '10px',
          }}>
            TaskFlow
          </h1>

          <p style={{
            textAlign: 'center',
            marginBottom: '25px',
          }}>
            Smart Task Management
          </p>

          <h2 style={{ marginBottom: '20px' }}>
            {authMode === 'login' ? 'Login' : 'Create Account'}
          </h2>

          {authMode === 'register' && (
            <>
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </>
          )}

          <label style={{ display: 'block', marginBottom: '8px' }}>
  Email
</label>
<input
  type="email"
  value={email}
  onChange={e => setEmail(e.target.value)}
  placeholder="Enter your email"
  required
  style={{
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '18px',
  }}
/>

         <label style={{ display: 'block', marginBottom: '8px' }}>
  Password
</label>
<input
  type="password"
  value={password}
  onChange={e => setPassword(e.target.value)}
  placeholder="Enter your password"
  required
  style={{
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '18px',
  }}
/>

          {message && (
            <p style={{ margin: '12px 0', color: '#c0392b' }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            className="add-button"
            disabled={loading}
            style={{ width: '100%', marginTop: '20px' }}
          >
            {loading
              ? 'Please wait...'
              : authMode === 'login'
                ? 'Login'
                : 'Register'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '20px' }}>
            {authMode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}
            {' '}
            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === 'login' ? 'register' : 'login'
                )
                setMessage('')
              }}
              style={{
                border: 'none',
                background: 'none',
                color: '#26734d',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {authMode === 'login' ? 'Register' : 'Login'}
            </button>
          </p>
        </form>
      </div>
    )
  }

  // Dashboard
  return (
    <div className="app">

      <aside className="sidebar">
        <h2 className="logo">TaskFlow</h2>

        <nav>
          <a className="active" href="#">Dashboard</a>
          <a href="#my-tasks">My Tasks</a>
          <a href="#categories">Categories</a>
        </nav>

        <div className="sidebar-bottom">
          <p>Smart Task Management</p>
        </div>
      </aside>

      <main className="main-content">

        <header className="header">
          <div>
            <h1>Dashboard</h1>
            <p>
              Welcome back, {user?.name || 'User'}!
              {' '}Here's your task overview.
            </p>
          </div>

          <button className="profile" onClick={handleLogout}>
            Logout
          </button>
        </header>

        {message && (
          <p style={{ margin: '15px 0', color: '#26734d' }}>
            {message}
          </p>
        )}

        <section className="stats">

          <div className="stat-card">
            <p>Total Tasks</p>
            <h2>{tasks.length}</h2>
          </div>

          <div className="stat-card">
            <p>Completed</p>
            <h2>{completed}</h2>
          </div>

          <div className="stat-card">
            <p>In Progress</p>
            <h2>{inProgress}</h2>
          </div>

          <div className="stat-card">
            <p>Pending</p>
            <h2>{pending}</h2>
          </div>

        </section>

        <section className="tasks" id="tasks">

          <div className="task-heading">
            <h2>Recent Tasks</h2>

            <button
              className="add-button"
              onClick={handleAddClick}
            >
              + Add Task
            </button>
          </div>

          <div className="search-filter">

            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">All Tasks</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

          </div>

          {showForm && (
            <form
              className="task-form"
              onSubmit={handleSubmit}
            >

              <h3>
                {editingId !== null ? 'Edit Task' : 'Add New Task'}
              </h3>

              <label>Task Title</label>
              <input
                type="text"
                placeholder="Enter task name"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />

              <label>Category</label>
              <input
                type="text"
                placeholder="Enter category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                required
              />

              <label>Due Date</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
              />
              <label>Assign To</label>
<select
  value={assignedUserId}
  onChange={e => setAssignedUserId(e.target.value)}
>
  <option value="">Unassigned</option>

  {users.map(user => (
    <option key={user.id} value={user.id}>
      {user.name}
    </option>
  ))}
</select>
              <label>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <div className="form-actions">
                <button
                  type="submit"
                  className="add-button"
                  disabled={loading}
                >
                  {loading
                    ? 'Saving...'
                    : editingId !== null
                      ? 'Update Task'
                      : 'Save Task'}
                </button>

                <button
                  type="button"
                  className="cancel-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>

            </form>
          )}

          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <div className="task-item" key={task.id}>

                <div>
                  <h3>{task.title}</h3>
                  <p>{task.category}</p>
                  <p>
  Assigned to: {task.assignedUserName || 'Unassigned'}
</p>
                  <p>
  Due: {task.dueDate
    ? task.dueDate.replace('T', ' ')
    : 'No due date'}
</p>
                </div>

                <div className="task-actions">

                  <span
                    className={`status ${
                      task.status === 'Completed'
                        ? 'completed'
                        : task.status === 'In Progress'
                          ? 'progress'
                          : 'pending'
                    }`}
                  >
                    {task.status}
                  </span>

                                   {Boolean(task.is_owner) && (
                    <>
                      <button
                        className="edit-button"
                        onClick={() => handleEdit(task)}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-button"
                        onClick={() => handleDelete(task.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}

                </div>

              </div>
            ))
          ) : (
            <p className="empty-message">
              No tasks found.
            </p>
          )}

        </section>

        <section className="tasks" id="categories">
          <div className="task-heading">
            <h2>Categories</h2>
          </div>

          <div className="stats">
            {[...new Set(
              tasks
                .map(task => task.category?.trim())
                .filter(Boolean)
            )].map(categoryName => {
              const count = tasks.filter(
                task => task.category?.trim() === categoryName
              ).length

              return (
                <div className="stat-card" key={categoryName}>
                  <h3>{categoryName}</h3>
                  <p>{count} {count === 1 ? 'Task' : 'Tasks'}</p>
                </div>
              )
            })}

            {tasks.every(task => !task.category?.trim()) && (
              <p>No categories yet. Add a category to your task.</p>
            )}
          </div>
        </section>

      </main>
    </div>
  )
}

export default App
