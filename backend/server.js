const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const verifyToken = require('./authMiddleware');
const app = express();
const PORT = 5000;

app.use(cors({
    origin: 'http://localhost:5173'
}));
app.use(express.json());

// Test API
app.get('/', (req, res) => {
    res.send('TaskFlow Backend is running!');
});
// Register API
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: 'Please fill in all fields'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: 'Password must be at least 6 characters'
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (name, email, password_hash)
            VALUES (?, ?, ?)
        `;

        db.query(sql, [name, email, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        message: 'Email already exists'
                    });
                }

                return res.status(500).json({
                    message: 'Registration failed'
                });
            }

            res.status(201).json({
                message: 'Registration successful!',
                userId: result.insertId
            });
        });
    } catch (error) {
        res.status(500).json({
            message: 'Server error'
        });
    }
});
// Login API
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: 'Please enter email and password'
        });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';

    db.query(sql, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    });
});
// Get all users API
app.get('/api/users', verifyToken, (req, res) => {
    const sql = `
        SELECT id, name, email
        FROM users
        WHERE id != ?
        ORDER BY name ASC
    `;

    db.query(sql, [req.user.id], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: 'Failed to retrieve users'
            });
        }

        res.json(results);
    });
});
// Get tasks for logged-in user
// Get tasks for logged-in user
app.get('/api/tasks', verifyToken, (req, res) => {
    const userId = req.user.id;

    const sql = `
        SELECT
            t.*,
            (t.user_id = ?) AS is_owner,
            (
                SELECT tu.user_id
                FROM task_users tu
                WHERE tu.task_id = t.id
                LIMIT 1
            ) AS assigned_user_id,
            (
                SELECT u.name
                FROM task_users tu
                JOIN users u ON tu.user_id = u.id
                WHERE tu.task_id = t.id
                LIMIT 1
            ) AS assigned_user_name
        FROM tasks t
        WHERE
            t.user_id = ?
            OR EXISTS (
                SELECT 1
                FROM task_users tu
                WHERE tu.task_id = t.id
                AND tu.user_id = ?
            )
        ORDER BY t.created_at DESC
    `;

    db.query(sql, [userId, userId, userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Failed to retrieve tasks'
            });
        }

        res.json(results);
    });
});

// Add Task API
app.post('/api/tasks', verifyToken, (req, res) => {
    const {
        title,
        category,
        due_date,
        status,
        assigned_user_id
    } = req.body;

    const userId = req.user.id;

    if (!title || !title.trim()) {
        return res.status(400).json({
            message: 'Task title is required'
        });
    }

    // Check assigned user
    if (assigned_user_id) {
        if (Number(assigned_user_id) === Number(userId)) {
            return res.status(400).json({
                message: 'You cannot assign a task to yourself'
            });
        }

        db.query(
            'SELECT id FROM users WHERE id = ?',
            [assigned_user_id],
            (err, users) => {
                if (err) {
                    return res.status(500).json({
                        message: 'Failed to verify assigned user'
                    });
                }

                if (users.length === 0) {
                    return res.status(404).json({
                        message: 'Assigned user not found'
                    });
                }

                createTask();
            }
        );
    } else {
        createTask();
    }

    function createTask() {
        const sql = `
            INSERT INTO tasks
            (title, category, due_date, status, user_id)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [
                title.trim(),
                category || null,
                due_date || null,
                status || 'Pending',
                userId
            ],
            (err, result) => {
                if (err) {
                    return res.status(500).json({
                        message: 'Failed to create task'
                    });
                }

                const taskId = result.insertId;

                if (!assigned_user_id) {
                    return res.status(201).json({
                        message: 'Task created successfully!',
                        taskId
                    });
                }

                db.query(
                    `INSERT INTO task_users (task_id, user_id)
                     VALUES (?, ?)`,
                    [taskId, assigned_user_id],
                    (assignErr) => {
                        if (assignErr) {
                            console.error(assignErr);

                            // Remove task if assignment fails
                            return db.query(
                                'DELETE FROM tasks WHERE id = ?',
                                [taskId],
                                () => {
                                    res.status(500).json({
                                        message: 'Failed to assign user'
                                    });
                                }
                            );
                        }

                        res.status(201).json({
                            message: 'Task created and assigned successfully!',
                            taskId
                        });
                    }
                );
            }
        );
    }
});
// Edit Task API
app.put('/api/tasks/:id', verifyToken, (req, res) => {
    const {
        title,
        category,
        due_date,
        status,
        assigned_user_id
    } = req.body;

    const taskId = req.params.id;
    const userId = req.user.id;

    if (!title || !title.trim()) {
        return res.status(400).json({
            message: 'Task title is required'
        });
    }

    if (
        assigned_user_id &&
        Number(assigned_user_id) === Number(userId)
    ) {
        return res.status(400).json({
            message: 'You cannot assign a task to yourself'
        });
    }

    const sql = `
        UPDATE tasks
        SET title = ?, category = ?, due_date = ?, status = ?
        WHERE id = ? AND user_id = ?
    `;

    db.query(
        sql,
        [
            title.trim(),
            category || null,
            due_date || null,
            status || 'Pending',
            taskId,
            userId
        ],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: 'Failed to update task'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Task not found'
                });
            }

            db.query(
                'DELETE FROM task_users WHERE task_id = ?',
                [taskId],
                (deleteErr) => {
                    if (deleteErr) {
                        return res.status(500).json({
                            message: 'Failed to update task assignment'
                        });
                    }

                    if (!assigned_user_id) {
                        return res.json({
                            message: 'Task updated successfully!'
                        });
                    }

                    db.query(
                        `INSERT INTO task_users (task_id, user_id)
                         VALUES (?, ?)`,
                        [taskId, assigned_user_id],
                        (assignErr) => {
                            if (assignErr) {
                                return res.status(500).json({
                                    message: 'Failed to assign user'
                                });
                            }

                            res.json({
                                message: 'Task updated and assigned successfully!'
                            });
                        }
                    );
                }
            );
        }
    );
});
// Delete Task API
app.delete('/api/tasks/:id', verifyToken, (req, res) => {
    const taskId = req.params.id;
    const userId = req.user.id;

    const sql = `
        DELETE FROM tasks
        WHERE id = ? AND user_id = ?
    `;

    db.query(sql, [taskId, userId], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: 'Failed to delete task'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Task not found'
            });
        }

        res.json({
            message: 'Task deleted successfully!'
        });
    });
});
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});