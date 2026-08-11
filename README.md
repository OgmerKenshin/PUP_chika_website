# PUP Chika Website

Welcome to the PUP Chika Website! This is a dynamic, glassmorphism-themed discussion board for students with an integrated Java Spring Boot backend and an Oracle SQL database.

## 🚀 Getting Started

### 1. Database Configuration
To protect sensitive credentials, your local database configuration is ignored by Git. You must create your own configuration file based on the provided template:

1. Navigate to the backend resources folder:
   `cd account-service/account-service/src/main/resources`
2. Copy the template file:
   `cp application.yaml.example application.yaml`
3. Open `application.yaml` and update the `password` (and `url`/`username` if necessary) to match your local Oracle SQL database credentials.

### 2. Running the Backend
Once your database is configured, you can start the Spring Boot server. From the `account-service/account-service` directory, run:
```powershell
.\mvnw.cmd spring-boot:run
```
The backend will boot up and connect to Oracle SQL.

### 3. Database Seeder (Default Accounts)
When the backend starts, a `DatabaseSeeder` will automatically populate the database with required tables and the following default accounts (if they do not already exist):

| Role  | Name    | Email              | Password    |
|-------|---------|--------------------|-------------|
| ADMIN | Admin   | admin@example.com  | admin123    |
| USER  | Adrian  | adrian@example.com | password123 |
| USER  | Kenshin | kenshin@example.com| password123 |

You can use these accounts to immediately test signing in and interacting with the application.

### 4. Running the Frontend
The frontend is a vanilla HTML/CSS/JS single-page application.
To run the frontend:
1. Open the `public` folder in VS Code.
2. Use the **Live Server** extension (or any local web server) to serve `index.html`.
3. The frontend will automatically communicate with the backend running on `http://localhost:8080`.

### 5. Running Tests
The project includes a comprehensive suite of integration and unit tests. The tests use an in-memory H2 database, so they will run successfully without requiring an Oracle SQL connection.

To run the tests, execute the following command in the `account-service/account-service` directory:
```powershell
.\mvnw.cmd test
```
