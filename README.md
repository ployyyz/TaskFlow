
# TaskFlow – Smart Task Management System

TaskFlow is a web-based task management application that helps users organize, manage, and track their daily tasks efficiently.

## Features

- User Registration and Login
- Secure Authentication using JWT
- Password Hashing with bcrypt
- Create, Read, Update, and Delete Tasks (CRUD)
- Task Categories
- Task Status Management
- Assign Tasks to Other Users
- Due Date and Time Management
- Search and Filter Tasks
- Dashboard with Task Statistics
- Responsive User Interface

## Technologies Used

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express.js
- MySQL
- JWT
- bcryptjs

## Project Structure

```text
TaskFlow/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── authMiddleware.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   └── package.json
│
└── README.md
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd TaskFlow
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the backend folder and configure the database connection and JWT secret.

### 4. Start the Backend

```bash
node server.js
```

Backend runs at:

`http://localhost:5000`

### 5. Install Frontend Dependencies

Open another terminal:

```bash
cd frontend
npm install
```

### 6. Start the Frontend

```bash
npm run dev
```

Frontend runs at:

`http://localhost:5173`

## Database

Database: MySQL

Database name: `taskflow_db`

## Author

Computer Engineering Student
