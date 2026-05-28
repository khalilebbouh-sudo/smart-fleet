# Project Constitution
Project Name: Smart Fleet Management

## Purpose
Smart Fleet Management is a web-based system designed to manage a company's vehicle fleet efficiently.  
The application allows administrators to manage vehicles, drivers, maintenance operations, and fuel consumption.

---

## Core Architecture Principles

### 1. Clean Architecture
The system must follow a modular and maintainable architecture.

Backend:
- Laravel MVC architecture
- Controllers handle HTTP requests
- Models manage database entities
- Services handle business logic

Frontend:
- Angular modular architecture
- Separate modules for each feature
- Reusable components and services

---

### 2. Separation of Concerns
Each layer of the application must have a clear responsibility.

- Controllers → handle requests and responses
- Services → contain business logic
- Models → interact with the database
- Components → handle UI logic

---

### 3. API-First Design
The backend must expose a RESTful API that will be consumed by the Angular frontend.

API rules:
- JSON responses
- Clear endpoints
- Standard HTTP methods (GET, POST, PUT, DELETE)

---

### 4. Code Quality
All code must follow best practices.

Guidelines:
- Use meaningful variable and function names
- Follow Laravel and Angular coding conventions
- Write readable and maintainable code
- Avoid duplicated logic

---

### 5. Security
Security must be considered in all layers.

Requirements:
- Authentication system
- Input validation
- Protected API routes
- Secure database interactions

---

### 6. Scalability
The system must be designed to allow future improvements.

Possible future features:
- GPS vehicle tracking
- AI-based maintenance prediction
- Advanced fleet analytics
- Mobile application integration

---

## Technology Stack

### Frontend
Angular

### Backend
Laravel REST API

### Database
MySQL

---

## Development Tools

- Cursor IDE
- Spec-Kit
- Git
- XAMPP

### Versions mémorisées (environnement de dev)

- Node.js: v20.20.0 | npm: 10.8.2
- Angular CLI: 17.8.2
- PHP: 8.2.12 | Composer: 2.8.9
- Git: 2.49.0.windows.1
- MariaDB: 15.1 Distrib 10.4.32
- Laravel: 11.48.0
