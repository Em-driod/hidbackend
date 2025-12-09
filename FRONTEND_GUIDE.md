# Frontend Developer Guide for HID Backend API

This document provides guidance for frontend developers on how to interact with the HID Backend API.

## 1. Documentation Files in `document/` Folder

The files `infrastructure.t`, `requestflow.t`, `security.t`, and `steps.t` in your `document` folder are currently empty. These files typically serve as documentation for various aspects of the project. For a frontend developer, these documents would ideally provide:

*   **`infrastructure.t`**: Details on how the backend is deployed, where it's hosted, and any specific configurations needed for frontend interaction (e.g., base URL for API calls).
*   **`requestflow.t`**: A clear explanation of the typical data flow for different user actions, including which API endpoints are called in what sequence.
*   **`security.t`**: Information about authentication mechanisms, authorization rules, and any specific security headers or practices the frontend should follow.
*   **`steps.t`**: A guide for setting up the development environment, running tests, or deploying changes to the backend.

**Currently, since these files are empty, they don't offer any guidance.** You would need to populate them with relevant information for them to be useful to a frontend developer.

## 2. API Endpoints

Your backend exposes the following main routes:

### Authentication Routes (`/api/auth`)

Defined in `src/routes/authRoutes.ts`, handled by `src/controllers/authController.ts`.

*   **POST `/api/auth/signup`**:
    *   **Purpose**: Registers a new user.
    *   **Request Body**:
        ```json
        {
            "email": "user@example.com",
            "password": "strongpassword123",
            "firstName": "John",
            "lastName": "Doe"
        }
        ```
    *   **Success Response (201 Created)**:
        ```json
        {
            "message": "User successfully registered.",
            "user": {
                "userId": "uuid-of-user",
                "email": "user@example.com",
                "healthId": "HID-uuid-of-healthid"
            }
        }
        ```
    *   **Error Responses**:
        *   `400 Bad Request`: Missing required fields or invalid email format.
        *   `409 Conflict`: Email address already in use.
        *   `500 Internal Server Error`: Other server-side errors.

*   **POST `/api/auth/login`**:
    *   **Purpose**: Authenticates a user and issues a JWT token.
    *   **Request Body**:
        ```json
        {
            "email": "user@example.com",
            "password": "strongpassword123"
        }
        ```
    *   **Success Response (200 OK)**:
        ```json
        {
            "token": "eyJhbGciOiJIUzI1Ni...", // JWT Token
            "userId": "uuid-of-user"
        }
        ```
    *   **Error Responses**:
        *   `400 Bad Request`: Missing email or password, or invalid email format.
        *   `401 Unauthorized`: Invalid credentials (email/password mismatch).
        *   `500 Internal Server Error`: Other server-side errors or `JWT_SECRET` not configured.

### User Routes (`/api/users`)

Defined in `src/routes/userRoutes.ts`, handled by `src/controllers/userController.ts`. This route is protected.

*   **PUT `/api/users/profile`**:
    *   **Purpose**: Updates a user's profile and emergency information.
    *   **Authentication**: Requires a valid JWT in the `Authorization` header.
    *   **Request Body**: (Details would be in `userController.ts`, but generally includes fields like `firstName`, `lastName`, `emergencyContactName`, `emergencyContactNumber`, etc.)
        ```json
        {
            "firstName": "Jane",
            "lastName": "Doe",
            "emergencyContactName": "Alice Smith",
            "emergencyContactNumber": "+15551234567"
        }
        ```
    *   **Success Response (200 OK)**:
        ```json
        {
            "message": "Profile updated successfully."
        }
        ```
    *   **Error Responses**:
        *   `401 Unauthorized`: Missing or invalid token.
        *   `400 Bad Request`: Invalid input data.
        *   `500 Internal Server Error`: Server-side errors.

### Medical Data Routes (`/api/medical`)

Defined in `src/routes/medicalRoutes.ts`, handled by `src/controllers/medicalDataController.ts`. All routes under `/api/medical` are protected by `authenticateToken`.

*   **POST `/api/medical/allergies`**:
    *   **Purpose**: Creates a new allergy entry for the authenticated user.
    *   **Authentication**: Requires a valid JWT.
    *   **Request Body**: (Details would be in `medicalDataController.ts`, but likely `allergyName`, `severity`, etc.)
        ```json
        {
            "allergyName": "Penicillin",
            "severity": "High",
            "reaction": "Hives"
        }
        ```
    *   **Success Response (201 Created)**:
        ```json
        {
            "message": "Allergy added successfully.",
            "allergy": { "id": "uuid-of-allergy", "allergyName": "Penicillin" }
        }
        ```
*   **GET `/api/medical/allergies`**:
    *   **Purpose**: Retrieves all allergy entries for the authenticated user.
    *   **Authentication**: Requires a valid JWT.
    *   **Success Response (200 OK)**:
        ```json
        [
            { "id": "uuid-1", "allergyName": "Penicillin", "severity": "High", "reaction": "Hives" },
            { "id": "uuid-2", "allergyName": "Dust", "severity": "Medium", "reaction": "Sneezing" }
        ]
        ```
*   **DELETE `/api/medical/allergies/:allergyId`**:
    *   **Purpose**: Deletes a specific allergy entry for the authenticated user.
    *   **Authentication**: Requires a valid JWT.
    *   **URL Parameter**: `:allergyId` (the UUID of the allergy to delete).
    *   **Success Response (200 OK)**:
        ```json
        {
            "message": "Allergy deleted successfully."
        }
        ```
*   **POST `/api/medical/conditions`**:
    *   **Purpose**: Creates a new chronic condition entry for the authenticated user.
    *   **Authentication**: Requires a valid JWT.
    *   **Request Body**: (Details would be in `medicalDataController.ts`, but likely `conditionName`, `diagnosisDate`, etc.)
        ```json
        {
            "conditionName": "Diabetes Type 2",
            "diagnosisDate": "2020-01-15"
        }
        ```
    *   **Success Response (201 Created)**:
        ```json
        {
            "message": "Condition added successfully.",
            "condition": { "id": "uuid-of-condition", "conditionName": "Diabetes Type 2" }
        }
        ```
*   **GET `/api/medical/conditions`**:
    *   **Purpose**: Retrieves all chronic condition entries for the authenticated user.
    *   **Authentication**: Requires a valid JWT.
    *   **Success Response (200 OK)**:
        ```json
        [
            { "id": "uuid-3", "conditionName": "Diabetes Type 2", "diagnosisDate": "2020-01-15" },
            { "id": "uuid-4", "conditionName": "Hypertension", "diagnosisDate": "2018-05-20" }
        ]
        ```

## 3. Authentication (JSON Web Tokens - JWT)

Your backend uses JSON Web Tokens (JWT) for authentication. Here's how a frontend developer would handle it:

1.  **Login to Obtain a Token**:
    *   The frontend initiates a POST request to `/api/auth/login` with the user's email and password.
    *   Upon successful login, the backend responds with a JWT token (e.g., `eyJhbGciOiJIUzI1Ni...`).
    *   The frontend should store this token securely, typically in `localStorage` or `sessionStorage`.

2.  **Making Authenticated Requests**:
    *   For any protected routes (e.g., `/api/users/profile`, all `/api/medical/*` routes), the frontend must include the JWT in the `Authorization` header of every request.
    *   The format is `Authorization: Bearer <YOUR_JWT_TOKEN>`.

    **Example (using `fetch` in JavaScript):**
    ```javascript
    // Assuming you've stored the token after login
    const token = localStorage.getItem('jwtToken');

    fetch('/api/medical/allergies', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Include the JWT here
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Handle unauthorized/forbidden access, e.g., redirect to login page
                console.error('Authentication failed. Please log in again.');
            }
            throw new Error('Network response was not ok.');
        }
        return response.json();
    })
    .then(data => {
        console.log('User allergies:', data);
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
    ```

## 4. Conceptual Examples of Making Frontend Requests

To make API calls from a frontend application (like one built with React, Vue, Angular, or even plain JavaScript), you'll typically use the `fetch` API or a library like `axios`.

Here are conceptual examples for common operations:

### 1. User Registration (POST `/api/auth/signup`)

```javascript
async function registerUser(email, password, firstName, lastName) {
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, firstName, lastName })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Registration failed:', data.error);
            return null;
        }

        console.log('Registration successful:', data.message, data.user);
        return data.user;
    } catch (error) {
        console.error('Network or other error during registration:', error);
        return null;
    }
}

// Example usage:
// registerUser('newuser@example.com', 'password123', 'New', 'User');
```

### 2. User Login (POST `/api/auth/login`)

```javascript
async function loginUser(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Login failed:', data.error);
            return null;
        }

        console.log('Login successful. Token:', data.token);
        localStorage.setItem('jwtToken', data.token); // Store the token
        localStorage.setItem('userId', data.userId);   // Store the userId
        return data.token;
    } catch (error) {
        console.error('Network or other error during login:', error);
        return null;
    }
}

// Example usage:
// loginUser('existing@example.com', 'password123');
```

### 3. Adding a Medical Condition (POST `/api/medical/conditions`) - *Requires Authentication*

```javascript
async function addMedicalCondition(conditionName, diagnosisDate) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('No JWT token found. Please log in.');
        return null;
    }

    try {
        const response = await fetch('/api/medical/conditions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Include JWT for authentication
            },
            body: JSON.stringify({ conditionName, diagnosisDate })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Adding condition failed:', data.error);
            return null;
        }

        console.log('Condition added successfully:', data.condition);
        return data.condition;
    } catch (error) {
        console.error('Network or other error during adding condition:', error);
        return null;
    }
}

// Example usage:
// addMedicalCondition('Hypertension', '2018-05-20');
```

### 4. Getting All Allergies (GET `/api/medical/allergies`) - *Requires Authentication*

```javascript
async function getAllAllergies() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('No JWT token found. Please log in.');
        return null;
    }

    try {
        const response = await fetch('/api/medical/allergies', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` // Include JWT for authentication
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Fetching allergies failed:', data.error);
            return null;
        }

        console.log('User allergies:', data);
        return data;
    } catch (error) {
        console.error('Network or other error during fetching allergies:', error);
        return null;
    }
}

// Example usage:
// getAllAllergies();
```

## 5. High-Level Overview of Backend Functionality

This backend is designed as a RESTful API to manage health-related user data. Here's a high-level overview of its functionality:

1.  **User Authentication and Authorization**:
    *   Allows users to register (`/api/auth/signup`) and log in (`/api/auth/login`).
    *   Upon successful login, a JSON Web Token (JWT) is issued, which is then used to authenticate subsequent requests to protected routes.
    *   Middleware (`authMiddleware.ts`) verifies the JWT to ensure only authorized users can access sensitive data.

2.  **User Profile Management**:
    *   Users can update their profiles, including personal and emergency contact information (`/api/users/profile`).

3.  **Medical Data Storage**:
    *   The system allows for the creation, retrieval, and deletion of specific medical records tied to a user. Currently, this includes:
        *   **Allergies**: Users can add, view, and remove their allergies (`/api/medical/allergies`).
        *   **Chronic Conditions**: Users can add and view their chronic medical conditions (`/api/medical/conditions`).

4.  **Database**:
    *   The backend interacts with a PostgreSQL database (`pg` library) to persist all user and medical data. Database operations are handled through a `Pool` for efficient connection management.

5.  **Technology Stack**:
    *   **Node.js** with **Express.js** for the API framework.
    *   **TypeScript** for type safety and better code maintainability.
    *   **`dotenv`** for managing environment variables (e.g., database credentials, JWT secret).
    *   **`bcryptjs`** for secure password hashing.
    *   **`jsonwebtoken`** for JWT creation and verification.
    *   **`uuid`** for generating unique IDs.

In essence, the backend provides a secure and structured way to store and retrieve sensitive health identity information for authenticated users, making it accessible for frontend applications.
