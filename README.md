# IoT Device Management & OTA Orchestration System

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

A centralized, scalable, and secure platform for managing IoT device fleets and orchestrating Over-The-Air (OTA) firmware updates.

## Features

* Device Registration & Management
* Secure OTA Firmware Updates
* MQTT-Based Real-Time Communication
* Device Group Management
* Firmware Repository
* JWT Authentication
* Role-Based Access Control (RBAC)
* SHA-256 Firmware Verification
* Real-Time Dashboard Monitoring
* Dockerized Deployment

## Tech Stack

### Frontend

* React.js
* Vite
* Tailwind CSS

### Backend

* FastAPI
* Python

### Communication

* MQTT
* Eclipse Mosquitto

### Databases

* PostgreSQL
* MongoDB

### Hardware

* ESP32

### DevOps

* Docker
* Docker Compose

## Architecture

The system follows a four-tier architecture:

1. ESP32 Edge Devices
2. MQTT Communication Layer
3. FastAPI Application Layer
4. PostgreSQL + MongoDB Persistence Layer

## Security Features

* TLS Encrypted MQTT Communication
* JWT Authentication
* RBAC Authorization
* SHA-256 Firmware Integrity Verification
* Audit Logging

## Future Enhancements

* AI-Based Device Anomaly Detection
* Delta OTA Updates
* CI/CD Integration
* Kubernetes Deployment


## Application Screenshots

### Login Page

![Login](docs/screenshots/login.png)

### Dashboard

![Dashboard](docs/screenshots/Dashboard.png)

### Devices

![Devices](docs/screenshots/Devices.png)

### Device Groups

![Device Groups](docs/screenshots/Devices%20Group.png)

### Firmware Management

![Firmware](docs/screenshots/Firmware.png)

### OTA Updates

![OTA Updates](docs/screenshots/OTA%20Updates.png)

### Logs & Alerts

![Logs](docs/screenshots/Logs%20%26%20Alerts.png)

### User Management

![Users](docs/screenshots/Users.png)

### Settings

![Settings](docs/screenshots/Settings.png)
